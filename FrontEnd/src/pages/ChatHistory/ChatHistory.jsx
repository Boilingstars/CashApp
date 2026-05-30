import { useNavigate } from 'react-router-dom'

import iconEdit from '../../assets/icons/icon-edit.svg'
import { chatHistory } from '../../lib/mocks/chatMocks.js'
import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'

import styles from './ChatHistory.module.css'

function HistoryListItem({ item, onSelect }) {
  return (
    <li className={styles.listItem}>
      <button type="button" className={styles.listButton} onClick={() => onSelect(item)}>
        {item.title}
      </button>
    </li>
  )
}

export function ChatHistory() {
  const navigate = useNavigate()

  const goToHome = () => navigate('/')

  const goToNewChat = () => navigate('/chat')

  // TEMP / TODO: открытие конкретного проекта или чата из истории
  const handleHistoryItem = () => {}

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <BackButton />
        <button type="button" className={styles.exitButton} onClick={goToHome}>
          Выйти из чата
        </button>
      </header>

      <main className={styles.content}>
        <section className={styles.section} aria-labelledby="history-projects-title">
          <h2 id="history-projects-title" className={styles.sectionTitle}>
            Проекты
          </h2>
          <ul className={styles.list}>
            {chatHistory.projects.map((item) => (
              <HistoryListItem key={item.id} item={item} onSelect={handleHistoryItem} />
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="history-recent-title">
          <h2 id="history-recent-title" className={styles.sectionTitle}>
            Недавние
          </h2>
          <ul className={styles.list}>
            {chatHistory.recent.map((item) => (
              <HistoryListItem key={item.id} item={item} onSelect={handleHistoryItem} />
            ))}
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <button type="button" className={styles.newChatButton} onClick={goToNewChat}>
          <img className={styles.newChatIcon} src={iconEdit} alt="" aria-hidden="true" />
          Новый чат
        </button>
      </footer>
    </div>
  )
}
