import videoFirst from '../../assets/video/on_boarding_first_page.mp4'
import videoSecond from '../../assets/video/on_boarding_second_page.mp4'
import videoThird from '../../assets/video/on_boarding_third_page.mp4'
import videoFourth from '../../assets/video/on_boarding_fourth_page.mp4'

export const ONBOARDING_STEPS = [
  {
    id: 'control',
    title: 'Полный контроль финансов',
    description:
      'Доходы, расходы, инвестиции и накопления – в одном месте',
    videoSrc: videoFirst,
  },
  {
    id: 'credit',
    title: 'Взвешенные кредитные решения',
    description:
      'Оценка долговой нагрузки и рекомендации по управлению обязательствами',
    videoSrc: videoSecond,
  },
  {
    id: 'ai',
    title: 'Финансовый ИИ- помощник',
    description:
      'Психологическая поддержка, ответы на вопросы, помощь в решении задач',
    videoSrc: videoThird,
  },
  {
    id: 'cashback',
    title: 'Деньги, которые вы упускаете',
    description: 'Поиск кешбэка, налоговых вычетов и субсидий',
    videoSrc: videoFourth,
  },
]
