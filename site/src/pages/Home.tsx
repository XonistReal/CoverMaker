import { MenuShowcase } from '../sections/MenuShowcase';
import { FaqSection } from '../sections/home/FaqSection';
import { FinalCta } from '../sections/home/FinalCta';
import { GamesMarquee } from '../sections/home/GamesMarquee';
import { Hero } from '../sections/home/Hero';
import { HowItWorks } from '../sections/home/HowItWorks';
import { PopularProducts } from '../sections/home/PopularProducts';
import { ReviewsRow } from '../sections/home/ReviewsRow';
import { WhyUs } from '../sections/home/WhyUs';
import '../sections/home/home.css';

/** Landing page. No `.page` wrapper: the hero sits behind the transparent fixed navbar. */
export function HomePage() {
  return (
    <div className="home">
      <Hero />
      <GamesMarquee />
      <PopularProducts />
      <MenuShowcase />
      <WhyUs />
      <HowItWorks />
      <ReviewsRow />
      <FaqSection />
      <FinalCta />
    </div>
  );
}
