import { type Lesson, type Progress, isOpen } from '../../lessons';

interface Props {
  readonly lessons: readonly Lesson[];
  readonly progress: Progress;
  readonly unlockAll: boolean;
  readonly onOpen: (number: number) => void;
  readonly onPractice: () => void;
  readonly onBack: () => void;
}

export function LessonsScreen({ lessons, progress, unlockAll, onOpen, onPractice, onBack }: Props) {
  const trouble = progress.trouble.length;
  return (
    <div className="lessons">
      <h1>Leerpad</h1>
      <ol className="lesson-list">
        {lessons.map((lesson) => {
          const done = progress.completed.includes(lesson.number);
          const open = isOpen(progress, lesson.number, unlockAll);
          return (
            <li key={lesson.number}>
              <button
                type="button"
                className={done ? 'lesson-item lesson-done' : 'lesson-item'}
                disabled={!open}
                onClick={() => onOpen(lesson.number)}
              >
                <span className="lesson-number">Les {lesson.number}</span>
                <span className="lesson-title">{lesson.title}</span>
                <span className="lesson-status">{done ? 'Afgerond' : open ? 'Open' : 'Op slot'}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="lessons-actions">
        <button type="button" onClick={onBack}>
          Terug
        </button>
        <button type="button" disabled={trouble === 0} onClick={onPractice}>
          Oefen wat ik lastig vond{trouble > 0 ? ` (${trouble})` : ''}
        </button>
      </div>
    </div>
  );
}
