import { Link } from 'react-router-dom';
import { Card, Button, Pill } from '../components/ui';
import { Github, Globe, Linkedin, Mail, ShieldCheck, Sparkles, TreePine, Users, X } from 'lucide-react';

type Owner = {
  name: string;
  role: string;
  bio: string;
  tags: string[];
  avatarSrc: string;
  links: Array<{ label: string; href: string; icon: 'mail' | 'github' | 'linkedin' | 'web' | 'x' }>;
};

const owners: Owner[] = [
  {
    name: 'Dhananjay Narula',
    role: 'Founder',
    bio: 'Founder of WorkTree ID. Building a permanent identity layer for collaborative work—so people can create, share, and ship projects as living trees (roots → fruits) with clear ownership, privacy, and measurable progress.',
    tags: ['Identity', 'Work Trees', 'Collaboration', 'Product'],
    avatarSrc: '/owners/dhananjay-avatar.png',
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
    bio: 'Co-founder of WorkTree ID. Focused on turning ambitious ideas into collaborative systems—designing clear workflows, building community-ready experiences, and ensuring privacy and participation stay balanced as projects scale.',
    tags: ['Community', 'UX', 'Privacy', 'Operations'],
    avatarSrc: '/owners/srishti-avatar.png',
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
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Pill className="border-white/10 bg-white/5">About WorkTree ID</Pill>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">About us</h1>
          <p className="mt-3 max-w-2xl text-pretty text-white/70">
            WorkTree ID is an interactive platform where each person has a permanent identity (ID + optional username) and can build projects
            as a living tree of work — from roots to fruits — with collaborators.
          </p>
        </div>
        <Link to="/">
          <Button variant="secondary">Home</Button>
        </Link>
      </div>

      {/* Our story / mission / values */}
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="text-sm font-semibold text-white">Our story</div>
          <p className="mt-2 text-sm text-white/70">
            WorkTree ID started from a simple problem: most collaboration tools either feel too rigid for early ideas or too messy when projects
            grow. We wanted a system that keeps identity stable, makes collaboration explicit, and lets work evolve naturally—like a tree.
          </p>
          <p className="mt-3 text-sm text-white/70">
            The goal is to let anyone create solo work, invite trusted collaborators by ID/username, and publish public projects that others can
            discover and join—without losing structure, ownership, or progress visibility.
          </p>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-white">Mission</div>
          <p className="mt-2 text-sm text-white/70">
            Make building together as clear as building alone: permanent identity, flexible structure, and privacy controls by default.
          </p>
          <div className="mt-4 text-sm font-semibold text-white">Values</div>
          <ul className="mt-2 space-y-2 text-sm text-white/70">
            <li>• Clarity over complexity</li>
            <li>• Privacy and consent</li>
            <li>• Progress you can measure</li>
            <li>• Communities that can scale</li>
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
          <div className="mt-2 text-sm text-white/70">Invite collaborators via ID/username and track progress together.</div>
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
        <div className="flex items-center gap-2 text-white">
          <Sparkles size={18} />
          <div className="text-xl font-semibold">Owners</div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {owners.map((o) => (
            <Card key={o.name} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-white">{o.name}</div>
                  <div className="mt-1 text-sm text-white/60">{o.role}</div>
                </div>
                <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img src={o.avatarSrc} alt={o.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
              </div>

              <p className="mt-4 text-sm text-white/70">{o.bio}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {o.tags.map((t) => (
                  <Pill key={t} className="border-white/10 bg-white/5">{t}</Pill>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {o.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm">
                      {iconFor(l.icon)} {l.label}
                    </Button>
                  </a>
                ))}
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
