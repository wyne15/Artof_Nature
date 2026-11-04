import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCHEDULE, estimateDispatch, receivedOn, nthWorkingDay, shopStatus, validateSchedule,
  localParts, formatDate, isWorkingDay, addDays, isIsoDate, type Schedule,
} from "../src/lib/logistics.ts";

const S: Schedule = { ...DEFAULT_SCHEDULE };
// 2026-10-09 is a Friday. London is on BST (UTC+1) until 2026-10-25.
const at = (iso: string) => new Date(iso);

test("local time uses Europe/London, not the server zone", () => {
  assert.deepEqual(localParts(at("2026-07-01T07:30:00Z"), "Europe/London"), { date: "2026-07-01", hour: 8, minute: 30 });
  assert.deepEqual(localParts(at("2026-12-01T07:30:00Z"), "Europe/London"), { date: "2026-12-01", hour: 7, minute: 30 });
  // 23:30 UTC in summer is already the next day in London
  assert.equal(localParts(at("2026-07-01T23:30:00Z"), "Europe/London").date, "2026-07-02");
});

test("order after cutoff on Friday is received Monday", () => {
  assert.equal(receivedOn(at("2026-10-09T09:00:00Z"), S), "2026-10-12"); // 10:00 London
});

test("order before cutoff on a working day is received the same day", () => {
  assert.equal(receivedOn(at("2026-10-12T07:00:00Z"), S), "2026-10-12"); // 08:00 London, Monday
});

test("weekend orders are received Monday", () => {
  assert.equal(receivedOn(at("2026-10-10T09:00:00Z"), S), "2026-10-12");
});

test("estimate is 2 to 4 working days counted from the received day", () => {
  const e = estimateDispatch(at("2026-10-12T07:00:00Z"), S);
  assert.equal(e.receivedOn, "2026-10-12");
  assert.equal(e.earliest, "2026-10-13");
  assert.equal(e.latest, "2026-10-15");
});

test("a full day pushes the promised date forward", () => {
  const e = estimateDispatch(at("2026-10-12T07:00:00Z"), S, { "2026-10-15": 10 });
  assert.equal(e.latest, "2026-10-16");
  const e2 = estimateDispatch(at("2026-10-12T07:00:00Z"), S, { "2026-10-15": 10, "2026-10-16": 10 });
  assert.equal(e2.latest, "2026-10-19"); // skips the weekend
});

test("school holiday (open mode) moves the dates past the break", () => {
  const s: Schedule = { ...S, closures: [{ from: "2026-10-20", to: "2026-10-31", mode: "open" }] };
  assert.equal(isWorkingDay("2026-10-21", s), false);
  const e = estimateDispatch(at("2026-10-16T09:00:00Z"), s); // Fri 10:00 -> received Mon 19
  assert.equal(e.receivedOn, "2026-10-19");
  assert.equal(e.earliest, "2026-11-02");
  assert.equal(e.latest, "2026-11-04");
});

test("shop status: open, away (open closure) and paused", () => {
  const closures: Schedule["closures"] = [
    { from: "2026-10-20", to: "2026-10-31", mode: "open", noteRo: "Vacanță" },
    { from: "2026-12-24", to: "2027-01-03", mode: "paused" },
  ];
  const s: Schedule = { ...S, closures };
  assert.equal(shopStatus(at("2026-10-12T10:00:00Z"), s).state, "open");
  const away = shopStatus(at("2026-10-22T10:00:00Z"), s);
  assert.equal(away.state, "away");
  assert.equal(away.resumeOn, "2026-11-02");
  const paused = shopStatus(at("2026-12-28T10:00:00Z"), s);
  assert.equal(paused.state, "paused");
  assert.equal(paused.resumeOn, "2027-01-04");
  assert.equal(shopStatus(at("2026-10-12T10:00:00Z"), s, true).state, "paused");
});

test("nthWorkingDay counts the start day as day 1", () => {
  assert.equal(nthWorkingDay("2026-10-12", 1, S), "2026-10-12");
  assert.equal(nthWorkingDay("2026-10-12", 5, S), "2026-10-16");
  assert.equal(nthWorkingDay("2026-10-12", 6, S), "2026-10-19");
});

test("validateSchedule catches bad input", () => {
  assert.deepEqual(validateSchedule(S), []);
  assert.ok(validateSchedule({ ...S, workingDays: [] }).includes("working_days"));
  assert.ok(validateSchedule({ ...S, startHour: 15, endHour: 14 }).includes("hours"));
  assert.ok(validateSchedule({ ...S, leadMinDays: 5, leadMaxDays: 2 }).includes("lead_days"));
  assert.ok(validateSchedule({ ...S, closures: [{ from: "2026-10-31", to: "2026-10-20", mode: "open" }] }).includes("closure_dates"));
  assert.ok(validateSchedule({ ...S, closures: [{ from: "2026-02-30", to: "2026-03-02", mode: "open" }] }).includes("closure_dates"));
});

test("date helpers", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(formatDate("2026-10-13", "en"), "Tue 13 Oct");
  assert.equal(formatDate("2026-10-13", "ro"), "mar. 13 oct.");
});
