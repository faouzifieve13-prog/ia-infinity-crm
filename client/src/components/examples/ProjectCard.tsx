import { ProjectCard } from '../projects/ProjectCard';
import { mockProjects } from '@/lib/mock-data';

export default function ProjectCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {mockProjects.slice(0, 2).map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => console.log('Project clicked:', project.id)}
        />
      ))}
    </div>
  );
}
