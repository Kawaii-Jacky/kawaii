import Hero from '../sections/Hero'
import Glossary from '../sections/Glossary'
import TrendChart from '../sections/TrendChart'
import Structure from '../sections/Structure'
import Dependency from '../sections/Dependency'
import CountryProfiles from '../sections/CountryProfiles'
import PolicyToolbox from '../sections/PolicyToolbox'
import Economy from '../sections/Economy'
import Future from '../sections/Future'
import Footer from '../sections/Footer'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Glossary />
      <TrendChart />
      <Structure />
      <Dependency />
      <CountryProfiles />
      <PolicyToolbox />
      <Economy />
      <Future />
      <Footer />
    </main>
  )
}
