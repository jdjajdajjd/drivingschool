export interface DrivingCategoryInfo {
  code: string
  title: string
  description: string
  group: 'moto' | 'car' | 'truck' | 'bus' | 'special'
}

export const DRIVING_CATEGORIES: DrivingCategoryInfo[] = [
  { code: 'M', title: 'Мопеды', description: 'Мопеды и лёгкие квадрициклы.', group: 'moto' },
  { code: 'A1', title: 'Лёгкие мотоциклы', description: 'Мотоциклы до 125 см³.', group: 'moto' },
  { code: 'A', title: 'Мотоциклы', description: 'Мотоциклы без ограничения мощности.', group: 'moto' },
  { code: 'B1', title: 'Трициклы и квадрициклы', description: 'Трициклы и квадрициклы.', group: 'car' },
  { code: 'B', title: 'Легковой автомобиль', description: 'Самая частая категория для личного вождения.', group: 'car' },
  { code: 'BE', title: 'Легковой с прицепом', description: 'Автомобиль категории B с тяжёлым прицепом.', group: 'car' },
  { code: 'C1', title: 'Лёгкий грузовик', description: 'Грузовые автомобили средней массы.', group: 'truck' },
  { code: 'C', title: 'Грузовой автомобиль', description: 'Полноценная грузовая категория.', group: 'truck' },
  { code: 'C1E', title: 'C1 с прицепом', description: 'Лёгкий грузовик с прицепом.', group: 'truck' },
  { code: 'CE', title: 'Грузовой с прицепом', description: 'Грузовой состав с тяжёлым прицепом.', group: 'truck' },
  { code: 'D1', title: 'Малый автобус', description: 'Автобусы с ограниченным числом мест.', group: 'bus' },
  { code: 'D', title: 'Автобус', description: 'Пассажирские автобусы.', group: 'bus' },
  { code: 'D1E', title: 'D1 с прицепом', description: 'Малый автобус с прицепом.', group: 'bus' },
  { code: 'DE', title: 'Автобус с прицепом', description: 'Автобусный состав.', group: 'bus' },
  { code: 'Tm', title: 'Трамвай', description: 'Городской электротранспорт.', group: 'special' },
  { code: 'Tb', title: 'Троллейбус', description: 'Городской электротранспорт.', group: 'special' },
]

