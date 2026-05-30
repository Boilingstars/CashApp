import styles from './TransactionCard.module.css';

const TransactionCard = ({ amount, title, tag, date }) => {
  return (
    <div className={styles.card}>
      <span className={styles.title}>{title}</span>
      <span className={styles.tag}>{tag}</span>
      <span className={styles.amount}>{amount} ₽</span>
      <span className={styles.date}>{date}</span>
    </div>
  );
};

export default TransactionCard;