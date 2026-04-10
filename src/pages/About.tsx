import { Link } from 'react-router-dom';
import { Card, Button, Pill } from '../components/ui';
import { ArrowUpRight, Github, Globe, Linkedin, Mail, ShieldCheck, Sparkles, TreePine, Users, X } from 'lucide-react';
import { useEffect } from 'react';

type Owner = {
  name: string;
  role: string;
  bio: string;
  focus: string;
  tags: string[];
  avatarSrc: string;
  accent: string;
  links: Array<{ label: string; href: string; icon: 'mail' | 'github' | 'linkedin' | 'web' | 'x' }>;
};

const owners: Owner[] = [
  {
    name: 'Dhananjay Narula',
    role: 'Founder',
    bio: 'Founder of WorkTree ID. Building a permanent identity layer for collaborative work so people can create, share, and ship projects as living trees from roots to fruits with clear ownership, privacy, and measurable progress.',
    focus: 'Identity systems and product direction',
    tags: ['Identity', 'Work Trees', 'Collaboration', 'Product'],
    avatarSrc: 'https://res.cloudinary.com/dxw1yg7if/image/upload/v1772521159/photo_6116175361453264265_y_ka8fie.jpg',
    accent: 'from-emerald-400/30 via-cyan-300/10 to-transparent',
    links: [
      { label: 'Email', href: 'mailto:dhananjay0376@gmail.com', icon: 'mail' },
      { label: 'GitHub', href: 'https://github.com/Dhananjay0376/', icon: 'github' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/dhananjay-narula-6519363a1/', icon: 'linkedin' },
      { label: 'X', href: 'https://x.com/Dhananjay0376', icon: 'x' },
    ],
  },
  {
    name: 'Srishti Upadhyay',
    role: 'Co-Founder',
    bio: 'Co-founder of WorkTree ID. Focused on turning ambitious ideas into collaborative systems, designing clear workflows, building community-ready experiences, and keeping privacy and participation balanced as projects scale.',
    focus: 'Community experience and systems design',
    tags: ['Community', 'UX', 'Privacy', 'Operations'],
    avatarSrc: 'https://res.cloudinary.com/dxw1yg7if/image/upload/v1775658608/photo_6289730510233735516_y_cmcmhb.jpg',
    accent: 'from-amber-300/30 via-rose-300/10 to-transparent',
    links: [
      { label: 'Email', href: 'mailto:srishtiupadhyay797@gmail.com', icon: 'mail' },
      { label: 'GitHub', href: 'https://github.com/Srishti-ui731', icon: 'github' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/srishti-upadhyay-348206382/', icon: 'linkedin' },
    ],
  },
];

function iconFor(kind: Owner['links'][number]['icon']) {
  const cls = 'text-white/70';
  if (kind === 'mail') return <Mail size={16} className={cls} />;
  if (kind === 'github') return <Github size={16} className={cls} />;
  if (kind === 'linkedin') return <Linkedin size={16} className={cls} />;
  if (kind === 'x') return <X size={16} className={cls} />;
  return <Globe size={16} className={cls} />;
}

export default function About() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Pill className="border-white/10 bg-white/5">About WorkTree ID</Pill>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">About us</h1>
          <p className="mt-3 max-w-2xl text-pretty text-white/70">
            WorkTree ID is an interactive platform where each person has a permanent identity (ID + optional username) and can build projects
            as a living tree of work from roots to fruits with collaborators.
          </p>
        </div>
        <Link to="/">
          <Button variant="secondary">Home</Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="text-sm font-semibold text-white">Our story</div>
          <p className="mt-2 text-sm text-white/70">
            WorkTree ID started from a simple problem: most collaboration tools either feel too rigid for early ideas or too messy when projects
            grow. We wanted a system that keeps identity stable, makes collaboration explicit, and lets work evolve naturally like a tree.
          </p>
          <p className="mt-3 text-sm text-white/70">
            The goal is to let anyone create solo work, invite trusted collaborators by ID or username, and publish public projects that others
            can discover and join without losing structure, ownership, or progress visibility.
          </p>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-white">Mission</div>
          <p className="mt-2 text-sm text-white/70">
            Make building together as clear as building alone: permanent identity, flexible structure, and privacy controls by default.
          </p>
          <div className="mt-4 text-sm font-semibold text-white">Values</div>
          <ul className="mt-2 space-y-2 text-sm text-white/70">
            <li>- Clarity over complexity</li>
            <li>- Privacy and consent</li>
            <li>- Progress you can measure</li>
            <li>- Communities that can scale</li>
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck size={18} />
            <div className="font-semibold">Privacy-first</div>
          </div>
          <div className="mt-2 text-sm text-white/70">Public and private profiles/projects so you control what you share.</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-white">
            <Users size={18} />
            <div className="font-semibold">Built for groups</div>
          </div>
          <div className="mt-2 text-sm text-white/70">Invite collaborators via ID or username and track progress together.</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-white">
            <TreePine size={18} />
            <div className="font-semibold">Tree-structured work</div>
          </div>
          <div className="mt-2 text-sm text-white/70">Break big goals into branches, stems, leaves, and fruits.</div>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/35 to-transparent" />
          <div className="absolute -left-20 top-0 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.5fr_0.9fr] lg:items-start">
            <div>
              <div className="flex items-center gap-2 text-white">
                <Sparkles size={18} />
                <div className="text-xl font-semibold">Meet the owners</div>
              </div>
              <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-white/72 sm:text-base">
                WorkTree ID is being shaped hands-on by its founding team. The platform vision, collaboration model, and privacy-first product
                decisions all come directly from the people building it.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">Founding team</div>
                <div className="mt-2 text-2xl font-semibold text-white">{owners.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">Shared focus</div>
                <div className="mt-2 text-sm font-medium text-white/85">Identity, structure, community</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">Built for</div>
                <div className="mt-2 text-sm font-medium text-white/85">People who create together</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {owners.map((owner) => (
            <Card key={owner.name} className="group relative overflow-hidden p-6">
              <div className={`absolute inset-0 bg-linear-to-br ${owner.accent} opacity-80 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
              <div className="relative">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-[0_18px_45px_rgba(0,0,0,0.3)]">
                      <img src={owner.avatarSrc} alt={owner.name} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div>
                      <Pill className="border-white/15 bg-white/10 text-white/85">{owner.role}</Pill>
                      <div className="mt-3 text-xl font-semibold text-white">{owner.name}</div>
                      <div className="mt-1 text-sm text-white/60">{owner.focus}</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right sm:min-w-42">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Ownership</div>
                    <div className="mt-1 whitespace-nowrap text-sm font-medium text-white/85">Vision to execution</div>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-white/72">{owner.bio}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {owner.tags.map((tag) => (
                    <Pill key={tag} className="border-white/10 bg-black/25 text-white/80">
                      {tag}
                    </Pill>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {owner.links.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                      <Button variant="secondary" size="sm" className="bg-black/25 hover:bg-white/15">
                        {iconFor(link.icon)} {link.label} <ArrowUpRight size={14} className="text-white/50" />
                      </Button>
                    </a>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 p-6">
          <div className="text-sm font-semibold text-white">Contact</div>
          <div className="mt-2 text-sm text-white/70">
            For partnerships, feedback, or collaboration requests, reach out to the founders via email or LinkedIn.
          </div>
        </Card>
      </div>
    </div>
  );
}
