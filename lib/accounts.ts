import { Session, TherapistProfile, sessions as sarahSessions, profile as sarahProfile } from "./seed-data";

export interface Account {
  email: string;
  password: string;
  profile: TherapistProfile;
  sessions: Session[];
}

// ─── Marcus Rivera ────────────────────────────────────────────────────────────
const marcusProfile: TherapistProfile = {
  name: "Marcus Rivera, LCSW",
  annual_goal: 85000,
  target_weekly_sessions: 15,
  avg_session_duration: 50,
};

const marcusSessions: Session[] = [
  // Week of Jan 5
  { id: "m001", session_datetime: "2026-01-06T09:00:00", amount: 140, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m002", session_datetime: "2026-01-06T10:00:00", amount: 110, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  { id: "m003", session_datetime: "2026-01-07T09:00:00", amount: 145, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Depression treatment", session_duration: 60, payer: "Cigna" },
  { id: "m004", session_datetime: "2026-01-08T09:00:00", amount: 135, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "United Healthcare" },
  { id: "m005", session_datetime: "2026-01-09T09:00:00", amount: 120, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "CA", session_descriptor: "Initial assessment", session_duration: 60, payer: "Optum EAP" },
  // Week of Jan 12
  { id: "m006", session_datetime: "2026-01-12T09:00:00", amount: 140, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m007", session_datetime: "2026-01-12T10:00:00", amount: 112, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  { id: "m008", session_datetime: "2026-01-13T09:00:00", amount: 145, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Cigna" },
  { id: "m009", session_datetime: "2026-01-14T09:00:00", amount: 90, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "Sliding Scale" },
  { id: "m010", session_datetime: "2026-01-15T09:00:00", amount: 155, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Depression treatment", session_duration: 60, payer: "United Healthcare" },
  { id: "m011", session_datetime: "2026-01-16T09:00:00", amount: 130, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Trauma therapy", session_duration: 60, payer: "Humana" },
  // Week of Jan 19
  { id: "m012", session_datetime: "2026-01-20T09:00:00", amount: 140, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m013", session_datetime: "2026-01-20T10:00:00", amount: 108, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  { id: "m014", session_datetime: "2026-01-21T09:00:00", amount: 145, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Cigna" },
  { id: "m015", session_datetime: "2026-01-22T09:00:00", amount: 135, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "United Healthcare" },
  { id: "m016", session_datetime: "2026-01-23T09:00:00", amount: 125, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "CA", session_descriptor: "Trauma-focused session", session_duration: 60, payer: "Magellan EAP" },
  { id: "m017", session_datetime: "2026-01-23T11:00:00", amount: 95, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Depression treatment", session_duration: 60, payer: "Sliding Scale" },
  // Week of Jan 26
  { id: "m018", session_datetime: "2026-01-26T09:00:00", amount: 140, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m019", session_datetime: "2026-01-27T09:00:00", amount: 148, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Cigna" },
  { id: "m020", session_datetime: "2026-01-28T09:00:00", amount: 135, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "United Healthcare" },
  { id: "m021", session_datetime: "2026-01-29T09:00:00", amount: 110, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  { id: "m022", session_datetime: "2026-01-30T09:00:00", amount: 130, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Trauma therapy", session_duration: 60, payer: "Humana" },
  // Week of Feb 2
  { id: "m023", session_datetime: "2026-02-02T09:00:00", amount: 140, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m024", session_datetime: "2026-02-02T10:00:00", amount: 112, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  { id: "m025", session_datetime: "2026-02-03T09:00:00", amount: 148, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Cigna" },
  { id: "m026", session_datetime: "2026-02-04T09:00:00", amount: 138, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "United Healthcare" },
  { id: "m027", session_datetime: "2026-02-05T09:00:00", amount: 128, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "CA", session_descriptor: "Trauma-focused session", session_duration: 60, payer: "Optum EAP" },
  { id: "m028", session_datetime: "2026-02-06T09:00:00", amount: 88, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Depression treatment", session_duration: 60, payer: "Sliding Scale" },
  { id: "m029", session_datetime: "2026-02-06T10:00:00", amount: 133, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Trauma therapy", session_duration: 60, payer: "Humana" },
  // Week of Feb 9
  { id: "m030", session_datetime: "2026-02-09T09:00:00", amount: 140, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m031", session_datetime: "2026-02-10T09:00:00", amount: 148, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Cigna" },
  { id: "m032", session_datetime: "2026-02-11T09:00:00", amount: 110, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  { id: "m033", session_datetime: "2026-02-12T09:00:00", amount: 138, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "United Healthcare" },
  { id: "m034", session_datetime: "2026-02-13T09:00:00", amount: 155, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Depression treatment", session_duration: 60, payer: "Humana" },
  { id: "m035", session_datetime: "2026-02-13T10:30:00", amount: 92, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy session", session_duration: 60, payer: "Sliding Scale" },
  // Week of Feb 16
  { id: "m036", session_datetime: "2026-02-17T09:00:00", amount: 140, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m037", session_datetime: "2026-02-18T09:00:00", amount: 148, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Cigna" },
  { id: "m038", session_datetime: "2026-02-19T09:00:00", amount: 130, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "Humana" },
  { id: "m039", session_datetime: "2026-02-20T09:00:00", amount: 122, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "CA", session_descriptor: "Trauma-focused session", session_duration: 60, payer: "Magellan EAP" },
  { id: "m040", session_datetime: "2026-02-20T11:00:00", amount: 110, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  // Week of Feb 23
  { id: "m041", session_datetime: "2026-02-23T09:00:00", amount: 142, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m042", session_datetime: "2026-02-24T09:00:00", amount: 148, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Cigna" },
  { id: "m043", session_datetime: "2026-02-25T09:00:00", amount: 110, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  { id: "m044", session_datetime: "2026-02-26T09:00:00", amount: 138, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "United Healthcare" },
  { id: "m045", session_datetime: "2026-02-27T09:00:00", amount: 90, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Depression treatment", session_duration: 60, payer: "Sliding Scale" },
  { id: "m046", session_datetime: "2026-02-27T11:00:00", amount: 155, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Trauma therapy", session_duration: 60, payer: "Humana" },
  { id: "m047", session_datetime: "2026-02-27T13:00:00", amount: 125, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "CA", session_descriptor: "EAP session", session_duration: 60, payer: "Optum EAP" },
  // Week of Mar 2
  { id: "m048", session_datetime: "2026-03-02T09:00:00", amount: 140, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m049", session_datetime: "2026-03-03T09:00:00", amount: 150, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Cigna" },
  { id: "m050", session_datetime: "2026-03-04T09:00:00", amount: 112, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  { id: "m051", session_datetime: "2026-03-05T09:00:00", amount: 138, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "United Healthcare" },
  { id: "m052", session_datetime: "2026-03-06T09:00:00", amount: 128, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "CA", session_descriptor: "EAP session", session_duration: 60, payer: "Magellan EAP" },
  { id: "m053", session_datetime: "2026-03-06T10:30:00", amount: 155, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Depression treatment", session_duration: 60, payer: "Humana" },
  // Week of Mar 9
  { id: "m054", session_datetime: "2026-03-09T09:00:00", amount: 142, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m055", session_datetime: "2026-03-10T09:00:00", amount: 150, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Cigna" },
  { id: "m056", session_datetime: "2026-03-11T09:00:00", amount: 138, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "United Healthcare" },
  { id: "m057", session_datetime: "2026-03-12T09:00:00", amount: 110, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  { id: "m058", session_datetime: "2026-03-13T09:00:00", amount: 95, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Depression treatment", session_duration: 60, payer: "Sliding Scale" },
  { id: "m059", session_datetime: "2026-03-13T11:00:00", amount: 158, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Trauma therapy", session_duration: 60, payer: "Humana" },
  // Week of Mar 16 (partial — through Mar 19)
  { id: "m060", session_datetime: "2026-03-16T09:00:00", amount: 142, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "CBT session", session_duration: 60, payer: "BlueCross BlueShield" },
  { id: "m061", session_datetime: "2026-03-17T09:00:00", amount: 150, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Cigna" },
  { id: "m062", session_datetime: "2026-03-18T09:00:00", amount: 112, payment_option: "insurance", session_code: "90834", appointment_type: "individual", state: "CA", session_descriptor: "Anxiety management", session_duration: 45, payer: "Aetna" },
  { id: "m063", session_datetime: "2026-03-19T09:00:00", amount: 138, payment_option: "insurance", session_code: "90837", appointment_type: "individual", state: "CA", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "United Healthcare" },
];

// ─── Jordan Kim ───────────────────────────────────────────────────────────────
const jordanProfile: TherapistProfile = {
  name: "Jordan Kim, LPC",
  annual_goal: 60000,
  target_weekly_sessions: 10,
  avg_session_duration: 55,
};

const jordanSessions: Session[] = [
  // Week of Jan 12 (just starting out)
  { id: "j001", session_datetime: "2026-01-13T10:00:00", amount: 150, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Initial session", session_duration: 60, payer: "Self-Pay" },
  { id: "j002", session_datetime: "2026-01-15T14:00:00", amount: 120, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "TX", session_descriptor: "Initial assessment", session_duration: 60, payer: "Optum EAP" },
  { id: "j003", session_datetime: "2026-01-16T11:00:00", amount: 155, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Anxiety management", session_duration: 60, payer: "Self-Pay" },
  // Week of Jan 19
  { id: "j004", session_datetime: "2026-01-20T10:00:00", amount: 150, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Self-Pay" },
  { id: "j005", session_datetime: "2026-01-21T14:00:00", amount: 130, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "TX", session_descriptor: "EAP session", session_duration: 60, payer: "Magellan EAP" },
  { id: "j006", session_datetime: "2026-01-22T10:00:00", amount: 160, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Depression treatment", session_duration: 60, payer: "Self-Pay" },
  { id: "j007", session_datetime: "2026-01-23T14:00:00", amount: 75, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "Sliding Scale" },
  // Week of Jan 26
  { id: "j008", session_datetime: "2026-01-27T10:00:00", amount: 155, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Self-Pay" },
  { id: "j009", session_datetime: "2026-01-28T14:00:00", amount: 120, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "TX", session_descriptor: "EAP session", session_duration: 60, payer: "Optum EAP" },
  { id: "j010", session_datetime: "2026-01-29T10:00:00", amount: 160, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Anxiety management", session_duration: 60, payer: "Self-Pay" },
  { id: "j011", session_datetime: "2026-01-30T14:00:00", amount: 80, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Depression treatment", session_duration: 60, payer: "Sliding Scale" },
  // Week of Feb 2
  { id: "j012", session_datetime: "2026-02-03T10:00:00", amount: 155, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Self-Pay" },
  { id: "j013", session_datetime: "2026-02-04T14:00:00", amount: 155, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "Self-Pay" },
  { id: "j014", session_datetime: "2026-02-05T10:00:00", amount: 125, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "TX", session_descriptor: "EAP session", session_duration: 60, payer: "Magellan EAP" },
  { id: "j015", session_datetime: "2026-02-06T14:00:00", amount: 165, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Anxiety management", session_duration: 60, payer: "Self-Pay" },
  { id: "j016", session_datetime: "2026-02-06T16:00:00", amount: 82, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Depression treatment", session_duration: 60, payer: "Sliding Scale" },
  // Week of Feb 9
  { id: "j017", session_datetime: "2026-02-10T10:00:00", amount: 155, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Self-Pay" },
  { id: "j018", session_datetime: "2026-02-11T14:00:00", amount: 155, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "Self-Pay" },
  { id: "j019", session_datetime: "2026-02-12T10:00:00", amount: 160, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "CBT session", session_duration: 60, payer: "Self-Pay" },
  { id: "j020", session_datetime: "2026-02-13T14:00:00", amount: 125, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "TX", session_descriptor: "EAP session", session_duration: 60, payer: "Optum EAP" },
  { id: "j021", session_datetime: "2026-02-13T16:00:00", amount: 80, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Trauma therapy", session_duration: 60, payer: "Sliding Scale" },
  // Week of Feb 16
  { id: "j022", session_datetime: "2026-02-17T10:00:00", amount: 158, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Self-Pay" },
  { id: "j023", session_datetime: "2026-02-18T14:00:00", amount: 160, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "Self-Pay" },
  { id: "j024", session_datetime: "2026-02-19T10:00:00", amount: 125, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "TX", session_descriptor: "EAP session", session_duration: 60, payer: "Magellan EAP" },
  { id: "j025", session_datetime: "2026-02-20T14:00:00", amount: 82, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Depression treatment", session_duration: 60, payer: "Sliding Scale" },
  // Week of Feb 23
  { id: "j026", session_datetime: "2026-02-24T10:00:00", amount: 160, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Self-Pay" },
  { id: "j027", session_datetime: "2026-02-25T14:00:00", amount: 165, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "CBT session", session_duration: 60, payer: "Self-Pay" },
  { id: "j028", session_datetime: "2026-02-26T10:00:00", amount: 125, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "TX", session_descriptor: "EAP session", session_duration: 60, payer: "Optum EAP" },
  { id: "j029", session_datetime: "2026-02-27T14:00:00", amount: 165, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Anxiety management", session_duration: 60, payer: "Self-Pay" },
  { id: "j030", session_datetime: "2026-02-27T16:00:00", amount: 84, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "Sliding Scale" },
  // Week of Mar 2
  { id: "j031", session_datetime: "2026-03-03T10:00:00", amount: 165, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Self-Pay" },
  { id: "j032", session_datetime: "2026-03-04T14:00:00", amount: 165, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "CBT session", session_duration: 60, payer: "Self-Pay" },
  { id: "j033", session_datetime: "2026-03-05T10:00:00", amount: 128, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "TX", session_descriptor: "EAP session", session_duration: 60, payer: "Magellan EAP" },
  { id: "j034", session_datetime: "2026-03-05T14:00:00", amount: 170, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Anxiety management", session_duration: 60, payer: "Self-Pay" },
  { id: "j035", session_datetime: "2026-03-06T14:00:00", amount: 85, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "Sliding Scale" },
  { id: "j036", session_datetime: "2026-03-06T16:00:00", amount: 168, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Depression treatment", session_duration: 60, payer: "Self-Pay" },
  // Week of Mar 9
  { id: "j037", session_datetime: "2026-03-10T10:00:00", amount: 168, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Self-Pay" },
  { id: "j038", session_datetime: "2026-03-11T14:00:00", amount: 170, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "CBT session", session_duration: 60, payer: "Self-Pay" },
  { id: "j039", session_datetime: "2026-03-12T10:00:00", amount: 128, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "TX", session_descriptor: "EAP session", session_duration: 60, payer: "Optum EAP" },
  { id: "j040", session_datetime: "2026-03-13T14:00:00", amount: 170, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Anxiety management", session_duration: 60, payer: "Self-Pay" },
  { id: "j041", session_datetime: "2026-03-13T16:00:00", amount: 87, payment_option: "sliding-scale", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Ongoing treatment", session_duration: 60, payer: "Sliding Scale" },
  // Week of Mar 16 (partial — through Mar 19)
  { id: "j042", session_datetime: "2026-03-17T10:00:00", amount: 170, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "Weekly therapy", session_duration: 60, payer: "Self-Pay" },
  { id: "j043", session_datetime: "2026-03-18T14:00:00", amount: 170, payment_option: "self-pay", session_code: "90837", appointment_type: "individual", state: "TX", session_descriptor: "CBT session", session_duration: 60, payer: "Self-Pay" },
  { id: "j044", session_datetime: "2026-03-19T10:00:00", amount: 130, payment_option: "eap", session_code: "90791", appointment_type: "individual", state: "TX", session_descriptor: "EAP session", session_duration: 60, payer: "Magellan EAP" },
];

// ─── Account registry ─────────────────────────────────────────────────────────
export const accounts: Account[] = [
  {
    email: "sarah@therapay.dev",
    password: "password123",
    profile: sarahProfile,
    sessions: sarahSessions,
  },
  {
    email: "marcus@therapay.dev",
    password: "password123",
    profile: marcusProfile,
    sessions: marcusSessions,
  },
  {
    email: "jordan@therapay.dev",
    password: "password123",
    profile: jordanProfile,
    sessions: jordanSessions,
  },
];

export function findAccount(email: string): Account | undefined {
  return accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
}

export function validateCredentials(email: string, password: string): Account | null {
  const account = findAccount(email);
  if (!account) return null;
  if (account.password !== password) return null;
  return account;
}
