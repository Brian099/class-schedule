import { useMemo } from 'react';
import type {
  Holiday,
  PeriodConfig,
  SubjectItem,
  Weekday,
} from '../config/types';
import { WEEKDAYS } from '../config/types';
import {
  createSubjectLookup,
  subjectGradient,
  computeWeekParity,
  resolveSubjectName,
} from '../data/subjects';
import { pickEmptyChipColor } from '../data/emptyChipColor';
import { offsetLabel } from '../utils/dayOffset';
import { SvgIcon } from '../icons';
import SubjectIcon from './SubjectIcon';

// 取节次开始时间(分钟);无法解析时返回 NaN
const startMinutes = (time: string): number => {
  const start = time.split('-')[0]?.trim() ?? '';
  const [h, m] = start.split(':').map(v => Number.parseInt(v, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.NaN;
  return h * 60 + m;
};

interface Props {
  today: Weekday | null;
  /** 高亮那一天距今天的偏移:0=今天,1=明天,>=2=更晚的下一课日 */
  offsetDays?: number;
  schedule: Record<Weekday, string[]>;
  periods: PeriodConfig[];
  subjects: SubjectItem[];
  holiday?: Holiday | null;
  termStart?: string;
  /** 实际展示的星期(含按开关启用的周六/周日),默认周一至周五 */
  visibleWeekdays?: readonly Weekday[];
}

export default function ScheduleTable({
  today,
  offsetDays = 0,
  schedule,
  periods,
  subjects,
  holiday,
  termStart,
  visibleWeekdays = WEEKDAYS,
}: Props) {
  const isTomorrow = offsetDays === 1;
  // offsetDays>=2:今天不上课(周末/假期),高亮的是更晚的那个课日
  const isLaterDay = offsetDays >= 2;
  const badgeText = offsetLabel(offsetDays);
  const getSubject = useMemo(() => createSubjectLookup(subjects), [subjects]);
  const parity = useMemo(() => computeWeekParity(new Date(), termStart), [termStart]);
  // 节次类型由后台「课表」按节次标记,与课程名无关;分界线画在第一节课后服务之前
  const rowKinds = periods.map(p => p.kind ?? 'class');
  const afterSchoolStartIndex = rowKinds.findIndex(k => k === 'after-school');
  // 上午 / 下午分界:第一条在 12:00 之后开始的节次之前画线(与看板同一口径)
  const noonStartIndex = periods.findIndex(
    (p, i) => i > 0 && startMinutes(p.time) >= 12 * 60,
  );

  const tip = holiday
    ? `今日 ${holiday.name}，放假休息`
    : today
      ? isLaterDay
        ? `今天休息，${offsetDays}天后是 ${today}`
        : isTomorrow
          ? `明天是 ${today}，已提前高亮`
          : `今天是 ${today}，已高亮显示`
      : '今天休息，好好玩耍';

  // 当天列在可见星期中的下标;不在可见范围(如周末未开启)时为 -1,不画外框
  const todayColumnIndex = today ? visibleWeekdays.indexOf(today) : -1;

  return (
    <section className="schedule-card">
      <header className="schedule-header">
        <h2 className="section-title">
          <span className="section-title-icon">
            <SvgIcon name="calendar" size={20} />
          </span>
          课程表
        </h2>
        <div className="schedule-actions">
          <span className="schedule-tip">{tip}</span>
        </div>
      </header>
      <div
        className="schedule-grid"
        style={{
          ['--visible-days' as string]: String(visibleWeekdays.length),
          ['--today-index' as string]: String(todayColumnIndex),
        }}
      >
        {todayColumnIndex >= 0 && (
          <div className="schedule-today-frame" aria-hidden="true" />
        )}
        <div className="schedule-head-row">
          <div className="grid-cell period-head">节次</div>
          {visibleWeekdays.map(day => {
            const isToday = day === today;
            const classes = [
              'grid-cell',
              'weekday-head',
              isToday ? 'weekday-head-today' : '',
              isToday && offsetDays > 0 ? 'weekday-head-preview' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div key={day} className={classes}>
                <span className="weekday-head-name">{day}</span>
                {isToday && (
                  <span className="weekday-head-badge">{badgeText}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="schedule-body">
          {periods.map((period, rowIndex) => {
            const isAfterSchool = rowKinds[rowIndex] === 'after-school';
            const isBreakRow = rowKinds[rowIndex] === 'break';
            const isAfterSchoolStart = rowIndex === afterSchoolStartIndex;
            const isNoonStart = rowIndex === noonStartIndex;
            const rowClasses = [
              'schedule-row',
              isAfterSchool ? 'row-after-school' : '',
              isBreakRow ? 'row-break' : '',
              isAfterSchoolStart ? 'row-after-school-start' : '',
              isNoonStart ? 'row-noon-start' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div key={period.index} className={rowClasses}>
                <div className="grid-cell period-cell">
                  <span className="period-label">{period.label}</span>
                </div>
                {visibleWeekdays.map(day => {
                  const rawName = schedule[day]?.[rowIndex] ?? '';
                  const isEmpty = !rawName.trim();
                  const subjectName = resolveSubjectName(rawName, subjects, parity);
                  const subject = getSubject(subjectName);
                  return (
                    <div key={day} className="grid-cell subject-cell">
                      <div
                        className={`subject-chip${isEmpty ? ' subject-chip-empty' : ''}`}
                        style={{
                          background: isEmpty
                            ? subjectGradient(pickEmptyChipColor(day, rowIndex))
                            : subjectGradient(subject.color),
                        }}
                      >
                        {!isEmpty && (
                          <>
                            {!subject.hideIcon && (
                              <span className="subject-icon">
                                <SubjectIcon subject={subject} size={18} />
                              </span>
                            )}
                            <span className="subject-name">{subject.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
