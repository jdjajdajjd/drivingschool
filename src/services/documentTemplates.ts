import type { Branch, Instructor, School, Student } from '../types'

type PrintFormType = 'contract' | 'application' | 'consent_data_processing'
type PrintPacketType = PrintFormType | 'training_card' | 'exam_admission'

const FORM_LABELS: Record<PrintFormType, string> = {
  contract: 'Договор на обучение',
  application: 'Заявление на обучение',
  consent_data_processing: 'Согласие на обработку персональных данных',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function row(label: string, value?: string): string {
  return `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '________________')}</strong></div>`
}

function buildBody(type: PrintFormType, params: { school: School; student: Student; branch?: Branch | null; instructor?: Instructor | null }): string {
  const { school, student, branch, instructor } = params
  const baseRows = [
    row('Автошкола', school.name),
    row('Ученик', student.name),
    row('Телефон ученика', student.phone),
    row('Категория', student.categoryCodes?.join(', ') || 'B'),
    row('Филиал', branch?.name),
    row('Адрес филиала', branch?.address || school.address),
    row('Инструктор', instructor?.name),
    row('Группа', student.groupName),
  ].join('')

  if (type === 'contract') {
    return `${baseRows}<p>Стороны подтверждают обучение по выбранной категории, порядок посещения занятий, ручной учет оплат и правила допуска к практике и экзаменам.</p><p>Оплаты фиксируются сотрудником автошколы в кабинете vroom после фактического поступления средств.</p>`
  }
  if (type === 'application') {
    return `${baseRows}<p>Прошу зачислить меня на обучение в указанную автошколу и предоставить доступ к расписанию, документам, оплатам и истории занятий.</p>`
  }
  return `${baseRows}<p>Даю согласие автошколе на обработку персональных данных для ведения обучения, расписания, оплат, документов и экзаменов.</p>`
}

function buildPacketSection(type: PrintPacketType, params: { school: School; student: Student; branch?: Branch | null; instructor?: Instructor | null }): string {
  const { school, student, branch, instructor } = params
  const title = type === 'training_card' ? 'Учебная карточка' : type === 'exam_admission' ? 'Лист допуска к экзамену' : FORM_LABELS[type]
  const baseRows = [
    row('Автошкола', school.name),
    row('Ученик', student.name),
    row('Телефон', student.phone),
    row('Категория', student.categoryCodes?.join(', ') || 'B'),
    row('Филиал', branch?.name),
    row('Инструктор', instructor?.name),
    row('Группа', student.groupName),
  ].join('')
  if (type === 'training_card') {
    return `<section class="sheet"><h1>${escapeHtml(title)}</h1>${baseRows}${row('Дата начала', student.trainingStartDate)}${row('Дата выпуска', student.trainingEndDate)}${row('Статус', student.trainingStage)}<p>Отметки занятий, практики, оплат и документов ведутся в кабинете vroom. Эта форма нужна для печати и внутреннего архива автошколы.</p><div class="sign"><div class="line">Ответственный администратор</div><div class="line">Ученик</div></div></section>`
  }
  if (type === 'exam_admission') {
    return `<section class="sheet"><h1>${escapeHtml(title)}</h1>${baseRows}${row('Договор', 'проверить')}${row('Медсправка', 'проверить')}${row('Госпошлина', 'проверить')}${row('Долг', '0 ₽')}${row('Практика', 'закрыта')}${row('Внутренний экзамен', 'сдан')}<p>Допуск подтверждает, что ученик готов к следующему экзаменационному шагу по внутренним правилам автошколы.</p><div class="sign"><div class="line">Ответственный за допуск</div><div class="line">Ученик</div></div></section>`
  }
  return `<section class="sheet"><h1>${escapeHtml(title)}</h1><div class="meta">Сформировано в vroom.today · ${new Date().toLocaleDateString('ru-RU')}</div>${buildBody(type, params)}<div class="sign"><div class="line">Представитель автошколы</div><div class="line">Ученик</div></div></section>`
}

export function openStudentPrintForm(type: PrintFormType, params: { school: School; student: Student; branch?: Branch | null; instructor?: Instructor | null }): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100')
  if (!win) return
  const title = FORM_LABELS[type]
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    *{box-sizing:border-box} body{font-family:Arial,sans-serif;margin:0;background:#f5f7fa;color:#111827} .page{width:210mm;min-height:297mm;margin:0 auto;background:white;padding:22mm 18mm} h1{font-size:22px;margin:0 0 20px} .meta{font-size:12px;color:#667085;margin-bottom:22px}.row{display:grid;grid-template-columns:52mm 1fr;gap:8px;border-bottom:1px solid #e5eaf1;padding:9px 0;font-size:14px}.row span{color:#667085}.row strong{font-weight:700} p{font-size:14px;line-height:1.55}.sign{display:grid;grid-template-columns:1fr 1fr;gap:22mm;margin-top:36mm;font-size:14px}.line{border-top:1px solid #111827;padding-top:8px}@media print{body{background:white}.page{margin:0;box-shadow:none}}
  </style></head><body><main class="page"><h1>${escapeHtml(title)}</h1><div class="meta">Сформировано в vroom.today · ${new Date().toLocaleDateString('ru-RU')}</div>${buildBody(type, params)}<div class="sign"><div class="line">Представитель автошколы</div><div class="line">Ученик</div></div></main><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`)
  win.document.close()
}

export function openStudentPrintPacket(params: { school: School; student: Student; branch?: Branch | null; instructor?: Instructor | null }): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100')
  if (!win) return
  const forms: PrintPacketType[] = ['contract', 'application', 'consent_data_processing', 'training_card', 'exam_admission']
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Пакет документов</title><style>
    *{box-sizing:border-box} body{font-family:Arial,sans-serif;margin:0;background:#f5f7fa;color:#111827}.sheet{width:210mm;min-height:297mm;margin:0 auto 8mm;background:white;padding:22mm 18mm;page-break-after:always} h1{font-size:22px;margin:0 0 20px}.meta{font-size:12px;color:#667085;margin-bottom:22px}.row{display:grid;grid-template-columns:52mm 1fr;gap:8px;border-bottom:1px solid #e5eaf1;padding:9px 0;font-size:14px}.row span{color:#667085}.row strong{font-weight:700} p{font-size:14px;line-height:1.55}.sign{display:grid;grid-template-columns:1fr 1fr;gap:22mm;margin-top:36mm;font-size:14px}.line{border-top:1px solid #111827;padding-top:8px}@media print{body{background:white}.sheet{margin:0;box-shadow:none}}
  </style></head><body>${forms.map((form) => buildPacketSection(form, params)).join('')}<script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`)
  win.document.close()
}
