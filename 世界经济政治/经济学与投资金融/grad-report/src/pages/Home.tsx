import { useEffect } from 'react'
import Nav from '../components/Nav'
import { ReadingProgress } from '../components/bits'
import Hero from '../sections/Hero'
import { PartBanner, PartDivider, AppendixBanner } from '../sections/PartDivider'
import MastersGate from '../sections/MastersGate'
import MastersSpectrum from '../sections/MastersSpectrum'
import MastersGrad from '../sections/MastersGrad'
import MastersFunding from '../sections/MastersFunding'
import MastersTime from '../sections/MastersTime'
import Gate from '../sections/Gate'
import Identity from '../sections/Identity'
import Duration from '../sections/Duration'
import Hours from '../sections/Hours'
import Weekend from '../sections/Weekend'
import Leave from '../sections/Leave'
import ModelLab from '../sections/ModelLab'
import Atlas from '../sections/Atlas'
import { Law, Gaps, Footer } from '../sections/LawGaps'

export default function Home() {
  // SPA 深链：初始 hash 在 React 渲染完成后补一次即时定位
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(id)
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 60
          const root = document.documentElement
          const prev = root.style.scrollBehavior
          root.style.scrollBehavior = 'auto'
          window.scrollTo(0, top)
          root.style.scrollBehavior = prev
        }
      })
    })
  }, [])

  return (
    <div className="relative">
      <div className="paper-noise" aria-hidden />
      <ReadingProgress />
      <Nav />
      <main>
        <Hero />
        <PartBanner />
        <MastersGate />
        <MastersSpectrum />
        <MastersGrad />
        <MastersFunding />
        <MastersTime />
        <PartDivider />
        <Gate />
        <Identity />
        <Duration />
        <Hours />
        <Weekend />
        <Leave />
        <AppendixBanner />
        <ModelLab />
        <Atlas />
        <Law />
        <Gaps />
      </main>
      <Footer />
    </div>
  )
}
