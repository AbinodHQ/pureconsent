import Link from 'next/link'
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Code2,
  Fingerprint,
  Leaf,
  ShieldCheck
} from 'lucide-react'
import { Brand } from '@/components/brand'
export default function Home () {
  return (
    <main className='landing'>
      <nav className='landing-nav'>
        <Brand />
        <div>
          <a href='#how'>How it works</a>
          <Link href='/docs'>Documentation</Link>
          <Link className='button dark compact' href='/dashboard'>
            Open workspace <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>
      <section className='hero'>
        <div className='hero-copy'>
          <div className='eyebrow'>
            <span className='live-dot' /> A MORE THOUGHTFUL WEB
          </div>
          <h1>
            Make room
            <br />
            for <em>trust.</em>
          </h1>
          <p>
            Privacy choices should feel simple. Give your visitors a clear
            voice, keep optional scripts in check, and make consent part of a
            better experience.
          </p>
          <div className='hero-actions'>
            <Link href='/dashboard' className='button dark'>
              Build your first banner <ArrowRight size={17} />
            </Link>
            <Link href='/docs' className='text-link'>
              Explore the integration <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className='hero-notes'>
            <span>
              <Check size={14} /> No tracking cookies from our widget
            </span>
            <span>
              <Check size={14} /> English & German
            </span>
          </div>
        </div>
        <div className='hero-preview'>
          <div className='browser-top'>
            <span />
            <span />
            <span />
            <small>YOUR WEBSITE, WITH A LITTLE MORE TRUST</small>
          </div>
          <iframe title='Try the PureConsent banner' src='/demo.html' />
          <div className='preview-caption'>
            <span className='live-dot' /> A real, interactive preview. Go ahead,
            make a choice.
          </div>
        </div>
      </section>
      <div className='ecosystem'>
        <span>AN ABINOD PRODUCT</span>
        <div>
          Built with care.
          <span>
            Powered by <strong>Ambiten ↗</strong>
          </span>
        </div>
        <Leaf size={22} strokeWidth={1.2} />
      </div>
      <section id='how' className='how'>
        <div className='section-intro'>
          <span className='eyebrow'>LESS FRICTION. MORE CLARITY.</span>
          <h2>
            Small footprint.
            <br />
            Meaningful choices.
          </h2>
          <p>
            A focused toolkit for businesses that want to treat privacy as part
            of the experience.
          </p>
        </div>
        <div className='feature-list'>
          <article>
            <Code2 />
            <div>
              <h3>One small script. A considered experience.</h3>
              <p>
                Add the widget and tag optional scripts by category. They stay
                inactive until a visitor opts in.
              </p>
            </div>
            <span>01</span>
          </article>
          <article>
            <Fingerprint />
            <div>
              <h3>A choice that stays theirs.</h3>
              <p>
                Equal accept and reject options, category controls, and a
                persistent privacy button. No preselected optional services.
              </p>
            </div>
            <span>02</span>
          </article>
          <article>
            <ShieldCheck />
            <div>
              <h3>Keep a record, not a profile.</h3>
              <p>
                Store choices and the notice version through Ambiten. No IP
                addresses or browsing histories in consent records.
              </p>
            </div>
            <span>03</span>
          </article>
        </div>
      </section>
      <section className='launch-note'>
        <span className='eyebrow'>THE FIRST CHAPTER</span>
        <h2>
          Your next Abinod product,
          <br />
          ready to take shape.
        </h2>
        <p>
          This initial release is an operator workspace for configuring and
          testing websites. Self-service accounts and subscriptions are planned
          for the commercial launch.
        </p>
        <Link href='/dashboard' className='button dark'>
          Enter the workspace <ArrowRight size={16} />
        </Link>
      </section>
      <footer>
        <Brand small />
        <span>Thoughtfully built by Abinod.</span>
        <div>
          <Link href='/privacy'>Privacy & storage</Link>
          <Link href='/docs'>Integration guide</Link>
        </div>
      </footer>
    </main>
  )
}
