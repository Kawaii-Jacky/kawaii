import Hero from '@/sections/Hero'
import Chapter1 from '@/sections/Chapter1'
import Chapter2 from '@/sections/Chapter2'
import Chapter3 from '@/sections/Chapter3'
import Chapter4 from '@/sections/Chapter4'
import Chapter5 from '@/sections/Chapter5'
import Chapter6 from '@/sections/Chapter6'
import Chapter7 from '@/sections/Chapter7'
import Footer from '@/sections/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-200 antialiased">
      <Hero />
      <Chapter1 />
      <Chapter2 />
      <Chapter3 />
      <Chapter4 />
      <Chapter5 />
      <Chapter6 />
      <Chapter7 />
      <Footer />
    </main>
  )
}
