import { useNavigate } from 'react-router-dom'

import iconCalendar from '../../assets/icons/icon_calendar.svg'
import iconArrowRight from '../../assets/icons/icon_arrow_right.svg'
import iconArrowUpRight from '../../assets/icons/icon_arrow-up-right.svg'
import { DonutChartCard } from '../../shared/ui/DonutChartCard/DonutChartCard.jsx'

import styles from './Transactions.module.css'

const debtChartData = [
  { name: 'Ежемесячные доходы', value: 75 },
  { name: 'Ежемесячные платежи', value: 25 },
]

const DEBT_SEGMENT_COLORS = ['#386FA4', '#91E5F6']

const donutData = debtChartData.map((item, index) => ({
  category_name: item.name,
  percent: item.value,
  color: DEBT_SEGMENT_COLORS[index],
  totalAmount: 0,
}))

const debtLoadPercent = `${debtChartData[1].value}%`

const Transactions = () => {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.spendingCard}
        onClick={() => navigate('/transactions/stats')}
        aria-label="Траты в этом месяце — нажмите, чтобы узнать"
      >
        <div className={styles.spendingText}>
          <p className={styles.spendingTitle}>Траты в этом месяце</p>
          <p className={styles.spendingSubtitle}>Нажмите, чтобы узнать</p>
        </div>
        <span className={styles.calendarIconWrap} aria-hidden="true">
          <img className={styles.calendarIcon} src={iconCalendar} alt="" />
        </span>
      </button>

      <DonutChartCard
        title="Уровень долговой нагрузки"
        data={donutData}
        totalAmount={0}
        centerText={debtLoadPercent}
        hideLegendAmounts
        legendFooter="Уровень: Оптимальный"
      />

      <div className={styles.chatButtonWrap}>
        <button
          type="button"
          className={styles.chatButton}
          onClick={() => navigate('/chat')}
        >
          <img
            className={styles.chatButtonIcon}
            src={iconArrowUpRight}
            alt=""
            aria-hidden="true"
          />
          <span className={styles.chatButtonText}>Спросить в чате</span>
        </button>
      </div>

      <button type="button" className={styles.infoRow} onClick={() => {}}>
        <div className={styles.infoText}>
          <p className={styles.infoTitle}>Узнай о своих возможностях</p>
          <p className={styles.infoSubtitle}>Получи налоговый вычет</p>
        </div>
        <img className={styles.chevron} src={iconArrowRight} alt="" aria-hidden="true" />
      </button>

      <button type="button" className={styles.infoRow} onClick={() => {}}>
        <div className={styles.infoText}>
          <p className={styles.infoTitle}>Деньги от государства</p>
          <p className={styles.infoSubtitle}>Субсидии, пособия и льготы</p>
        </div>
        <img className={styles.chevron} src={iconArrowRight} alt="" aria-hidden="true" />
      </button>
    </div>
  )
}

export { Transactions }
