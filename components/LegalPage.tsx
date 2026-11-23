import type { ReactNode } from 'react'
import Nav, { TabBarSpacer } from '@/components/Nav'
import Footer from '@/components/Footer'
import styles from './LegalPage.module.css'

export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="page-with-nav" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <main className={styles.page}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Last updated: {updated}</p>
        <div className={styles.intro}>{intro}</div>
        <div className={styles.body}>{children}</div>
      </main>
      <Footer />
      <TabBarSpacer />
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.section}><h2>{title}</h2>{children}</section>
}
