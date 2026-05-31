import { Bell, Globe, Lock, Share2, User, Wallet } from 'lucide-react'

import userAvatar from '../../assets/icon_user_profile.jpg'
import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'

import styles from './Profile.module.css'

const SETTINGS_ITEMS = [
  { id: 'data', label: 'Мои данные', Icon: User },
  { id: 'integrations', label: 'Интеграции', Icon: Share2 },
  { id: 'billing', label: 'Выставление счетов', Icon: Wallet },
  { id: 'notifications', label: 'Уведомления', Icon: Bell },
  { id: 'security', label: 'Безопасность', Icon: Lock },
  { id: 'locale', label: 'Язык и регион', Icon: Globe },
]

const LEGAL_LINKS = [
  { id: 'license', label: 'Лицензионное соглашение', variant: 'default' },
  { id: 'privacy', label: 'Политика конфиденциальности', variant: 'default' },
  { id: 'erase', label: 'Стереть информацию', variant: 'danger' },
  { id: 'delete', label: 'Удалить аккаунт', variant: 'danger' },
]

export function Profile() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <BackButton />
      </header>

      <section className={styles.profileCard} aria-label="Профиль пользователя">
        <img className={styles.avatar} src={userAvatar} alt="" width={62} height={62} />
        <div className={styles.profileText}>
          <p className={styles.profileName}>Альберт К</p>
          <p className={styles.profilePlan}>Подписка Pro</p>
        </div>
      </section>

      <h2 className={styles.sectionTitle}>Настройки</h2>

      <ul className={styles.menuList}>
        {SETTINGS_ITEMS.map(({ id, label, Icon }) => (
          <li key={id} className={styles.menuItem}>
            <button type="button" className={styles.menuButton}>
              <Icon className={styles.menuIcon} aria-hidden="true" strokeWidth={2} />
              <span className={styles.menuLabel}>{label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.legalBlock}>
        {LEGAL_LINKS.map(({ id, label, variant }) => (
          <button
            key={id}
            type="button"
            className={[
              styles.legalButton,
              variant === 'danger' ? styles.legalButtonDanger : null,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <button type="button" className={styles.logoutButton}>
        Выйти из аккаунта
      </button>
    </div>
  )
}
