/**
 * Real-time slot sync service.
 * Uses Supabase Realtime channels to receive slot updates,
 * with polling as a fallback when realtime is unavailable.
 */

import { db } from './storage'
import { supabase } from '../lib/supabase'
import type { Slot } from '../types'
import { startOfDay, format } from 'date-fns'

export interface SlotChangeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  slot: Slot
}

type Listener = (event: SlotChangeEvent) => void

class RealtimeSlotService {
  private listeners = new Set<Listener>()
  private channel: ReturnType<typeof supabase.channel> | null = null
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private schoolId: string | null = null
  private lastKnownSlots = new Map<string, Slot>()
  private isConnected = false

  /**
   * Start listening to real-time slot changes for a school.
   * Automatically falls back to polling if realtime is unavailable.
   */
  start(schoolId: string) {
    this.schoolId = schoolId

    // Store current slot states for change detection
    db.slots.all().forEach((slot) => this.lastKnownSlots.set(slot.id, slot))

    this.setupRealtime()
    this.startPolling()
  }

  stop() {
    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.stopPolling()
    this.listeners.clear()
    this.lastKnownSlots.clear()
    this.schoolId = null
    this.isConnected = false
  }

  /** Returns whether realtime connection is active */
  get isRealtimeActive(): boolean {
    return this.isConnected
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: SlotChangeEvent) {
    // Update lastKnownSlots
    if (event.type === 'DELETE') {
      this.lastKnownSlots.delete(event.slot.id)
    } else {
      this.lastKnownSlots.set(event.slot.id, event.slot)
    }

    // Notify all listeners
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {
        // ignore listener errors
      }
    }
  }

  private setupRealtime() {
    if (!this.schoolId) return

    const channelName = `slots:${this.schoolId}`

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: '' },
      },
    })

    this.channel
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'slots',
          filter: `school_id=eq.${this.schoolId}`,
        },
        async (payload: any) => {
          this.isConnected = true

          if (payload.eventType === 'DELETE') {
            this.emit({ type: 'DELETE', slot: { id: payload.old.id } as Slot })
            return
          }

          const row = payload.new as Record<string, unknown>
          if (!row) return

          const slot: Slot = {
            id: row.id as string,
            schoolId: row.school_id as string,
            instructorId: row.instructor_id as string,
            branchId: row.branch_id as string,
            date: row.date as string,
            time: row.time as string,
            duration: row.duration as number,
            status: row.status as Slot['status'],
            bookingId: row.booking_id as string | undefined,
          }

          this.emit({ type: payload.eventType === 'INSERT' ? 'INSERT' : 'UPDATE', slot })
        },
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.isConnected = false
          this.startPolling()
        }
      })
  }

  private startPolling() {
    if (this.pollInterval) return

    this.pollInterval = setInterval(() => {
      void this.checkForChanges()
    }, 8000) // poll every 8 seconds
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  private async checkForChanges() {
    if (!this.schoolId) return

    try {
      // Fetch current slots from Supabase (or local storage as fallback)
      const remoteSlots = await this.fetchRemoteSlots()
      if (!remoteSlots) return

      for (const remote of remoteSlots) {
        const local = this.lastKnownSlots.get(remote.id)
        const localDb = db.slots.byId(remote.id)

        if (!localDb) {
          // New slot appeared
          this.emit({ type: 'INSERT', slot: remote })
        } else if (!local) {
          // We don't have it in lastKnownSlots — check if it changed
          this.emit({ type: 'UPDATE', slot: remote })
        } else if (
          localDb.status !== remote.status ||
          localDb.bookingId !== remote.bookingId
        ) {
          // Status changed
          this.emit({ type: 'UPDATE', slot: remote })
        }
      }

      // Mark all fetched as known
      remoteSlots.forEach((slot) => this.lastKnownSlots.set(slot.id, slot))
    } catch {
      // Polling failed — continue silently, will retry
    }
  }

  private async fetchRemoteSlots(): Promise<Slot[] | null> {
    if (!this.schoolId) return null

    try {
      const { data, error } = await supabase
        .from('slots')
        .select('id, school_id, instructor_id, branch_id, date, time, duration, status, booking_id')
        .eq('school_id', this.schoolId)
        .gte('date', format(startOfDay(new Date()), 'yyyy-MM-dd'))

      if (error) return null

      return (data ?? []).map((row) => ({
        id: row.id,
        schoolId: row.school_id,
        instructorId: row.instructor_id,
        branchId: row.branch_id,
        date: row.date,
        time: row.time,
        duration: row.duration ?? 90,
        status: row.status as Slot['status'],
        bookingId: row.booking_id ?? undefined,
      }))
    } catch {
      return null
    }
  }
}

// Singleton instance
export const realtimeSlots = new RealtimeSlotService()