/**
 * @file date util
 * @author netcon
 */

import dayjs from 'dayjs';
import relativeTimePlugin from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTimePlugin);

export const relativeTimeTo = (date: dayjs.ConfigType) => dayjs().to(dayjs(date));

export const toISOString = (date: dayjs.ConfigType) => dayjs(date).toISOString();
