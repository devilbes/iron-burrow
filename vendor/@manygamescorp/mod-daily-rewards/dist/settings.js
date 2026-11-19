import { SETTINGS_TEXT } from './settings-text.js';
export const DAILY_REWARDS_SETTINGS = {
    'schemaVersion': 1,
    'fields': [
        { ref: 'availability' },
        {
            'key': 'entry',
            'type': 'enum',
            'label': SETTINGS_TEXT['entry.label'],
            'options': [
                {
                    'value': 'bottomMenu',
                    'label': SETTINGS_TEXT['entry.bottomMenu.label'],
                },
                {
                    'value': 'hud',
                    'label': SETTINGS_TEXT['entry.hud.label'],
                },
            ],
            'default': 'hud',
        },
        {
            'key': 'hudSide',
            'type': 'enum',
            'label': SETTINGS_TEXT['hudSide.label'],
            'options': [
                {
                    'value': 'left',
                    'label': SETTINGS_TEXT['hudSide.left.label'],
                },
                {
                    'value': 'right',
                    'label': SETTINGS_TEXT['hudSide.right.label'],
                },
            ],
            'default': 'right',
            'visibleIf': {
                'entry': 'hud',
            },
        },
        {
            'key': 'icon',
            'type': 'image',
            'label': SETTINGS_TEXT['icon.label'],
            'accept': [
                'image/png',
                'image/webp',
            ],
            'maxBytes': 262144,
            'size': {
                'min': 96,
                'max': 512,
                'square': true,
            },
            'overridable': false,
        },
        {
            'key': 'badge',
            'type': 'boolean',
            'label': SETTINGS_TEXT['badge.label'],
            'default': true,
        },
        {
            'key': 'autoOpen',
            'type': 'boolean',
            'label': SETTINGS_TEXT['autoOpen.label'],
            'default': true,
        },
        {
            'key': 'track',
            'type': 'string',
            'label': SETTINGS_TEXT['track.label'],
            'help': SETTINGS_TEXT['track.help'],
            'maxLength': 64,
            'pattern': '^[a-z0-9_]{1,64}$',
            'default': 'daily',
            'overridable': false,
        },
        {
            'key': 'window',
            'type': 'enum',
            'label': SETTINGS_TEXT['window.label'],
            'options': [
                { 'value': 'week', 'label': SETTINGS_TEXT['window.week.label'] },
                { 'value': 'board', 'label': SETTINGS_TEXT['window.board.label'] },
                { 'value': 'calendar', 'label': SETTINGS_TEXT['window.calendar.label'] },
                { 'value': 'gift', 'label': SETTINGS_TEXT['window.gift.label'] },
            ],
            'default': 'week',
        },
        {
            'key': 'cycleLength',
            'type': 'integer',
            'label': SETTINGS_TEXT['cycleLength.label'],
            'min': 1,
            'max': 31,
            'default': 7,
        },
        {
            'key': 'onMiss',
            'type': 'boolean',
            'label': SETTINGS_TEXT['onMiss.label'],
            'help': SETTINGS_TEXT['onMiss.help'],
            'default': true,
        },
    ],
};
