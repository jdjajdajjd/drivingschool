# Onboarding Runbook

## Day 0: Intake

- School name, city, phone, email, director contact.
- Branches and addresses.
- Instructors: name, phone, categories, car, transmission, active status.
- Existing students in CSV: FIO, phone, email, category, group, instructor, stage.
- Working hours, cancellation rules, debt and document restrictions.

## Day 1: Setup

- Create the school in super-admin.
- Add branches and instructors.
- Import students from CSV in Admin -> Students.
- Configure booking rules in Settings.
- Create slots for 7 days ahead.
- Send the public school link to the owner and one test student.

## Day 2: Workflow Test

- Student registers and books a slot.
- Admin sees the booking in Schedule and Today.
- Admin marks a debt or missing document and checks restrictions.
- Admin cancels or reschedules one booking and verifies history.
- Export students CSV and verify it opens in spreadsheet software.

## Day 3: Pilot Start

- Publish the link to a small group of students.
- Monitor new bookings, failed login attempts, duplicate slot attempts, and admin questions.
- Run `/api/health` and Supabase dashboard check before wider rollout.
- Collect owner feedback after the first operational day.

## Migration Format

Preferred CSV headers: `ФИО;Телефон;Email;Категория;Группа;Инструктор;Этап`.

Supported English aliases: `name;phone;email;category;group;instructor;stage`.
