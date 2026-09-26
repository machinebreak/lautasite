export interface Project {
  id: string
  number: string
  status: string
  title: string
  description: string
  url: string
}

export const projects: Project[] = [
  {
    id: 'hardseek',
    number: '01',
    status: 'Launched',
    title: 'HardSeek',
    description: 'Hardware price metasearch engine',
    url: 'https://hardseek.net',
  },
  {
    id: 'futbolito',
    number: '02',
    status: 'Launched',
    title: 'Futbolito',
    description: 'Minigames and quizzes for football fans',
    url: 'https://futbolito.com.ar',
  },
  {
    id: 'beetbench',
    number: '03',
    status: 'Launched',
    title: 'BeetBench',
    description: 'Gaming benchmarks and FPS tracking',
    url: 'https://beetbench.com',
  },
]
