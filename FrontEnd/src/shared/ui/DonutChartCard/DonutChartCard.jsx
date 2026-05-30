import { Cell, Pie, PieChart } from 'recharts'

import { formatCurrency } from '../../../lib/utils/formatters.js'

import styles from './DonutChartCard.module.css'

const CHART_SIZE = 152
const PIE_CENTER = CHART_SIZE / 2
/** Центральный диск 82px (r=41) + зазор до дуг — TransactionStats */
const CENTER_DISC_RADIUS = 41
const RING_GAP = 7
const INNER_RADIUS = CENTER_DISC_RADIUS + RING_GAP
const OUTER_RADIUS = 65
const RING_THICKNESS = OUTER_RADIUS - INNER_RADIUS
/** Долговая нагрузка — Figma 814:1087 / 996:563 */
const DEBT_INNER_RADIUS = 50
const DEBT_OUTER_RADIUS = 73
const DEBT_RING_THICKNESS = DEBT_OUTER_RADIUS - DEBT_INNER_RADIUS
const PADDING_ANGLE = 2.5
/** Почти полукруглые «капсулы» на концах сегмента */
const CORNER_RADIUS = RING_THICKNESS / 2
const DEBT_CORNER_RADIUS = DEBT_RING_THICKNESS / 2
const PIE_START_ANGLE = 0

function parseLegendFooter(legendFooter) {
  if (!legendFooter) return { label: null, value: null }
  const colonIndex = legendFooter.indexOf(': ')
  if (colonIndex === -1) return { label: null, value: legendFooter }
  return {
    label: legendFooter.slice(0, colonIndex),
    value: legendFooter.slice(colonIndex + 2),
  }
}

export function DonutChartCard({
  title,
  data,
  totalAmount,
  monthLabel,
  centerText,
  hideLegendAmounts = false,
  legendFooter,
}) {
  const hasData = Array.isArray(data) && data.length > 0
  const formattedTotal = formatCurrency(totalAmount)
  const centerDisplay = centerText ?? formattedTotal
  const isDebtVariant = Boolean(centerText && hideLegendAmounts)
  const innerRadius = isDebtVariant ? DEBT_INNER_RADIUS : INNER_RADIUS
  const outerRadius = isDebtVariant ? DEBT_OUTER_RADIUS : OUTER_RADIUS
  const cornerRadius = isDebtVariant ? DEBT_CORNER_RADIUS : CORNER_RADIUS
  const footerParts = parseLegendFooter(legendFooter)

  return (
    <section
      className={[styles.root, isDebtVariant ? styles.rootDebt : null].filter(Boolean).join(' ')}
      aria-label={title}
    >
      <h2 className={styles.title}>{title}</h2>

      {!hasData ? (
        <p className={styles.empty}>Нет данных за период</p>
      ) : (
        <div className={[styles.body, isDebtVariant ? styles.bodyDebt : null].filter(Boolean).join(' ')}>
          <div className={styles.chartWrap}>
            <PieChart
              width={CHART_SIZE}
              height={CHART_SIZE}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              className={styles.chart}
            >
              <Pie
                data={data}
                dataKey="percent"
                nameKey="category_name"
                cx={PIE_CENTER}
                cy={PIE_CENTER}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={PIE_START_ANGLE}
                endAngle={PIE_START_ANGLE + 360}
                stroke="none"
                isAnimationActive={false}
                paddingAngle={PADDING_ANGLE}
                cornerRadius={cornerRadius}
                label={false}
                labelLine={false}
              >
                {data.map((entry) => (
                  <Cell key={entry.category_name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>

            <div
              className={[
                styles.centerDisc,
                isDebtVariant ? styles.centerDiscDebt : null,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden="true"
            >
              <div className={styles.center}>
                {monthLabel ? <p className={styles.monthLabel}>{monthLabel}</p> : null}
                <p
                  className={[
                    styles.centerAmount,
                    isDebtVariant ? styles.centerAmountLarge : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {centerDisplay}
                </p>
              </div>
            </div>
          </div>

          <ul
            className={[
              styles.legend,
              isDebtVariant ? styles.legendDebt : null,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label="Легенда диаграммы"
          >
            {data.map((entry) => (
              <li
                key={entry.category_name}
                className={hideLegendAmounts ? styles.legendItemCompact : styles.legendItem}
              >
                <span className={styles.legendDotCell}>
                  <svg
                    className={[styles.legendDot, isDebtVariant ? styles.legendDotDebt : null]
                      .filter(Boolean)
                      .join(' ')}
                    viewBox={isDebtVariant ? '0 0 15 15' : '0 0 11 11'}
                    width={isDebtVariant ? 15 : 11}
                    height={isDebtVariant ? 15 : 11}
                    aria-hidden="true"
                  >
                    <circle
                      cx={isDebtVariant ? 7.5 : 5.5}
                      cy={isDebtVariant ? 7.5 : 5.5}
                      r={isDebtVariant ? 7.5 : 5.5}
                      fill={entry.color}
                    />
                  </svg>
                </span>
                <span
                  className={[
                    styles.legendName,
                    isDebtVariant ? styles.legendNameDebt : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isDebtVariant ? (
                    <>
                      <span className={styles.legendPercent}>{entry.percent}%</span>
                      {' '}
                      {entry.category_name}
                    </>
                  ) : (
                    entry.category_name
                  )}
                </span>
                {!hideLegendAmounts ? (
                  <span className={styles.legendAmount}>
                    {formatCurrency(entry.totalAmount)}
                  </span>
                ) : null}
              </li>
            ))}
            {legendFooter ? (
              <li className={styles.legendFooterBlock}>
                <div className={styles.legendFooterPill}>
                  {footerParts.label ? (
                    <span className={styles.legendFooterLabel}>{footerParts.label}</span>
                  ) : null}
                  {footerParts.value ? (
                    <span className={styles.legendFooterValue}>{footerParts.value}</span>
                  ) : null}
                </div>
              </li>
            ) : null}
          </ul>
        </div>
      )}
    </section>
  )
}
