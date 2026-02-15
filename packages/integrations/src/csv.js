"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCSV = generateCSV;
exports.exportToCSV = exportToCSV;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const luxon_1 = require("luxon");
async function generateCSV(run) {
    const responses = run.responses || [];
    const runDate = luxon_1.DateTime.fromJSDate(run.runDate).toISODate();
    const fileName = `${runDate}.csv`;
    const filePath = path_1.default.join(process.cwd(), 'exports', fileName);
    // Ensure exports directory exists
    const exportsDir = path_1.default.join(process.cwd(), 'exports');
    await fs_1.promises.mkdir(exportsDir, { recursive: true });
    // CSV Headers
    const headers = [
        'Person',
        'What working on',
        'Appetite',
        'Start date',
        'Scheduled done',
        'Actual done',
        'Progress',
        'Expectations',
        'At risk',
        'Decisions',
        'Going well',
        'Going poorly',
        'Notes',
        'Status',
        'SubmittedAt',
    ];
    // Build CSV rows
    const rows = responses.map((response) => {
        const answers = (response.answers || {});
        const member = response.rosterMember;
        const formatList = (val) => {
            if (Array.isArray(val)) {
                return val.filter((v) => v && v !== 'Nil').join('\n');
            }
            return val || '';
        };
        const formatDate = (val) => {
            if (typeof val === 'object' && val !== null) {
                return val.raw || '';
            }
            return val || '';
        };
        return [
            member.displayName,
            formatList(answers.what_working_on),
            answers.appetite || '',
            formatDate(answers.start_date),
            formatDate(answers.scheduled_done_date),
            formatDate(answers.actual_done_date),
            formatList(answers.progress_today),
            answers.expectations || '',
            formatList(answers.at_risk),
            formatList(answers.decisions),
            formatList(answers.going_well),
            formatList(answers.going_poorly),
            answers.notes || '',
            response.status,
            response.submittedAt ? luxon_1.DateTime.fromJSDate(response.submittedAt).toISO() : '',
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`); // Escape CSV
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    await fs_1.promises.writeFile(filePath, csv, 'utf-8');
    console.log(`CSV generated: ${filePath}`);
    // Update delivery job if this was triggered by one
    if (run.deliveryJobs) {
        const csvJob = run.deliveryJobs.find((j) => j.destination === 'CSV');
        if (csvJob) {
            csvJob.filePath = filePath;
        }
    }
    return filePath;
}
/**
 * Export CSV for a date range
 */
async function exportToCSV(workspaceId, fromDate, toDate) {
    const { prisma } = await Promise.resolve().then(() => __importStar(require('@standup-scribe/database')));
    const runs = await prisma.standupRun.findMany({
        where: {
            workspaceId,
            runDate: {
                gte: fromDate,
                lte: toDate,
            },
            status: 'CLOSED',
        },
        include: {
            responses: {
                include: {
                    rosterMember: true,
                },
            },
        },
        orderBy: {
            runDate: 'desc',
        },
    });
    if (runs.length === 0) {
        throw new Error('No runs found in date range');
    }
    const from = luxon_1.DateTime.fromJSDate(fromDate).toISODate();
    const to = luxon_1.DateTime.fromJSDate(toDate).toISODate();
    const fileName = `export_${from}_to_${to}.csv`;
    const filePath = path_1.default.join(process.cwd(), 'exports', fileName);
    const headers = [
        'Date',
        'Person',
        'What working on',
        'Appetite',
        'Start date',
        'Scheduled done',
        'Actual done',
        'Progress',
        'Expectations',
        'At risk',
        'Decisions',
        'Going well',
        'Going poorly',
        'Notes',
        'Status',
        'SubmittedAt',
    ];
    const rows = [];
    for (const run of runs) {
        for (const response of run.responses) {
            const answers = (response.answers || {});
            const member = response.rosterMember;
            const runDate = luxon_1.DateTime.fromJSDate(run.runDate).toISODate();
            const formatList = (val) => {
                if (Array.isArray(val)) {
                    return val.filter((v) => v && v !== 'Nil').join('\n');
                }
                return val || '';
            };
            const formatDate = (val) => {
                if (typeof val === 'object' && val !== null) {
                    return val.raw || '';
                }
                return val || '';
            };
            rows.push([
                runDate,
                member.displayName,
                formatList(answers.what_working_on),
                answers.appetite || '',
                formatDate(answers.start_date),
                formatDate(answers.scheduled_done_date),
                formatDate(answers.actual_done_date),
                formatList(answers.progress_today),
                answers.expectations || '',
                formatList(answers.at_risk),
                formatList(answers.decisions),
                formatList(answers.going_well),
                formatList(answers.going_poorly),
                answers.notes || '',
                response.status,
                response.submittedAt ? luxon_1.DateTime.fromJSDate(response.submittedAt).toISO() : '',
            ]);
        }
    }
    const csv = [
        headers.join(','),
        ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    await fs_1.promises.writeFile(filePath, csv, 'utf-8');
    return filePath;
}
//# sourceMappingURL=csv.js.map