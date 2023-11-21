import yadBot from './classes/YadBot.js';
import luxon from 'luxon';
import config from './config.json' assert { type: 'json' };
import axios from 'axios';
import rax from 'retry-axios';
import * as TerminalColors from './constants/TerminalColors.js';

rax.attach();

export function getLoggingTimestamp() {
    let currentTime = luxon.DateTime.local();
    return `${TerminalColors.yellow}[${currentTime.toFormat('dd.MM.')} ${TerminalColors.bright}${currentTime.toFormat(
        'HH:mm',
    )}${TerminalColors.reset}${TerminalColors.yellow}${currentTime.toFormat(':ss.SSS')}]${TerminalColors.reset}`;
}

export function log(...message) {
    console.log(`${getLoggingTimestamp()} ${message}`);
}

export function debugLog(...message) {
    if (!config.prod) {
        log(
            `${TerminalColors.BGred}${TerminalColors.black}${TerminalColors.bright}[DEBUG]${TerminalColors.reset} ${message}`,
        );
    }
}

export function errorLog(...message) {
    if (!config.prod) {
        log(
            `${TerminalColors.BGblack}${TerminalColors.red}${TerminalColors.bright}[ERROR]${TerminalColors.reset} ${message}`,
        );
    }
}
