import type { IconName } from '../icons';

export type Weekday =
  | '周一'
  | '周二'
  | '周三'
  | '周四'
  | '周五'
  | '周六'
  | '周日';

/** 工作日 5 天,主页/看板默认排列基础 */
export const WEEKDAYS: readonly Weekday[] = ['周一', '周二', '周三', '周四', '周五'];

/** 7 天全集,供开启周六/周日时使用 */
export const WEEKDAYS_FULL: readonly Weekday[] = [
  '周一',
  '周二',
  '周三',
  '周四',
  '周五',
  '周六',
  '周日',
];

export type PeriodKind = 'class' | 'break' | 'after-school';

export interface PeriodConfig {
  index: number;
  label: string;
  time: string;
  // 节次类型:决定该节是正课 / 课间休息 / 课后服务,是课表分界线与状态文案的唯一依据
  kind?: PeriodKind;
}

export type WeekMode = 'every' | 'biweekly';

export interface SubjectItem {
  name: string;
  icon: IconName;
  color: string;
  reminder?: string;
  reminderIcon?: IconName;
  weekMode?: WeekMode;
  oddSubject?: string;
  evenSubject?: string;
  iconImage?: string; // 上传的自定义图标 dataURL,优先级高于 icon
  hideIcon?: boolean; // 不显示图标
}

export interface Holiday {
  date: string;
  name: string;
  isRestDay: boolean;
}

export interface Student {
  id: string;
  title: string;
  /** 分享到微信/QQ 时卡片上的描述文字(og:description)。留空则按标题自动生成 */
  shareDescription?: string;
  logoIcon: IconName;
  logoImage?: string;
  timeBased: boolean;
  showMemo: boolean;
  showAdmin: boolean;
  weatherStation?: string;
  weatherCity?: string;
  termStart?: string;
  boardShowWeather?: boolean;
  boardShowMemo?: boolean;
  boardShowReminder?: boolean;
  showSaturday?: boolean;
  showSunday?: boolean;
  boardStyle?: 'default' | 'ink';
  periods: PeriodConfig[];
  schedule: Record<Weekday, string[]>;
  subjects: SubjectItem[];
}

export interface AppConfig {
  version: number;
  students: Student[];
  holidays: Holiday[];
}
