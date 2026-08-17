// frontend/src/pages/technician/components/ReportManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  listReports,
  searchPatientsAsTechnician,
  getAllTests,
  getBookingTests,
  getAllPatientBookings,
} from '../../../api/technician';
import './ReportManagement.css';

// ─── Helper: escape HTML ─────────────────────────────────────────
const escapeHtml = (val) =>
  String(val ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

// ─── Helper: load/save recent patients from localStorage ──────────
const RECENT_KEY = 'recentPatients_technician_mgmt';
const MAX_RECENT = 10;

const loadRecentPatients = () => {
  try {
    const data = localStorage.getItem(RECENT_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const saveRecentPatients = (list) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
};

// ─── Test field templates (same set used in Reporting.jsx) ──
const TEST_FIELD_TEMPLATES = {
  'Basic Diabetic Profile': [
    { key: 'hba1c', label: 'Glycosylated Hemoglobin (HbA1c)', unit: '%', ref: '<6: Non Diabetic, 6-7: Good Control, 7-8: Weak Control, >8: Poor Control' },
    { key: 'avg_glucose', label: 'Average Blood Glucose', unit: 'mg/dL', ref: '70-140' },
    { key: 'cholesterol_total', label: 'Cholesterol - Total', unit: 'mg/dL', ref: 'Non Diabetic: <200, Diabetic: <170, CAD: <140' },
    { key: 'serum_creatinine', label: 'Serum Creatinine', unit: 'mg/dL', ref: '0.72-1.18' },
    { key: 'urine_sugar', label: 'Urine Sugar', unit: 'mg/dL', ref: '0.6-1.4' },
    { key: 'urine_proteins', label: 'Urine Proteins', unit: 'NIL', ref: 'NIL' },
  ],
  'Blood Report': [
    { key: 'crp', label: 'C.R.P', unit: 'mg/dL', ref: '0 - 6.0 Mg/L' },
  ],
  'CRP': [
    { key: 'crp', label: 'C.R.P', unit: 'mg/dL', ref: '0 - 6.0 Mg/L' },
  ],
  'Complete Blood Counts': [
    { key: 'total_wbc', label: 'TOTAL WBC COUNT', unit: 'cells/Cum', ref: '4000 - 11000' },
    { key: 'lymphocytes', label: 'LYMPHOCYTES %', unit: '%', ref: '20 - 40' },
    { key: 'mid_cell', label: 'MID CELL POPULATION %', unit: '%', ref: '0 - 15.0' },
    { key: 'neutrophils', label: 'NEUTRO PHILS %', unit: '%', ref: '50.0 - 70.0' },
    { key: 'rbc_count', label: 'TOTAL RED BLOOD CELL COUNT', unit: 'mil/uL', ref: '3.5 - 5.5' },
    { key: 'hemoglobin', label: 'HEMOGLOBIN CONCENTRATION', unit: 'g/dL', ref: '11.0 - 15.0' },
    { key: 'hematocrit', label: 'HEMATO CRIT', unit: '%', ref: '36.0 - 48.0' },
    { key: 'mcv', label: 'MEAN CELL VOLUME', unit: 'fl', ref: '83 - 101' },
    { key: 'mch', label: 'MEAN CELL HEMOGLOBIN', unit: 'pg', ref: '27 - 32' },
    { key: 'mchc', label: 'M C H CONCENTRATION', unit: '%', ref: '31.5 - 34.5' },
    { key: 'rdw', label: 'RBC DISTRIBUTION WIDTH %', unit: '%', ref: '11.6 - 18.0' },
    { key: 'platelet_count', label: 'TOTAL PLATELET COUNT', unit: 'Laksh/cumm', ref: '1.50 - 4.50' },
    { key: 'mpv', label: 'MEAN PLATELET VOLUME', unit: 'fl', ref: '7.4 - 10.4' },
    { key: 'pdw', label: 'PLATELET DISTRIBUTION WIDTH', unit: 'fl', ref: '10.0 - 14.0' },
    { key: 'pct', label: 'PLATELET CRIT', unit: '%', ref: '0.10 - 0.28' },
    { key: 'lpcr', label: 'LARGE PLATELET CONCENTRATION RATIO', unit: '', ref: '' },
  ],
  'Dengue': [
    { key: 'igg', label: 'IgG', unit: '', ref: '' },
    { key: 'igm', label: 'IgM', unit: '', ref: '' },
    { key: 'ns1', label: 'NS1 Ag', unit: '', ref: '' },
    { key: 'mp', label: 'MP', unit: '', ref: '' },
  ],
  'Electrolytes': [
    { key: 'sodium', label: 'SERUM SODIUM', unit: 'mmol/L', ref: '135 - 145' },
    { key: 'potassium', label: 'SERUM POTASSIUM', unit: 'mmol/L', ref: '3.8 - 5.2' },
    { key: 'calcium', label: 'SERUM CALCIUM', unit: 'mg/dL', ref: '8.0 - 10.2' },
    { key: 'chloride', label: 'SERUM CHLORIDE', unit: 'mmol/L', ref: '98 - 108' },
  ],
  'HbA1c': [
    { key: 'hba1c', label: 'GLYCOSYLATED HEMOGLOBIN (HbA1c)', unit: '%', ref: '4.0-6.0' },
    { key: 'avg_glucose', label: 'AVERAGE BLOOD GLUCOSE', unit: 'mg/dL', ref: '90-120' },
  ],
  'Hemoglobin': [
    { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', ref: '13-17' },
  ],
  'Kidney': [
    { key: 'serum_creatinine', label: 'SERUM CREATININE', unit: 'mg/dL', ref: '0.6 - 1.4' },
    { key: 'blood_urea', label: 'BLOOD UREA', unit: 'mg/dL', ref: '10 - 40' },
    { key: 'bun', label: 'BLOOD UREA NITROGEN', unit: 'mg/dL', ref: '6.5 - 18.0' },
    { key: 'bun_creatinine_ratio', label: 'BUN/CREATININE RATIO', unit: 'mg/dL', ref: '7 - 25' },
    { key: 'egfr', label: 'ESTIMATED GLOMERULAR FILTRATION RATE (eGFR)', unit: 'ml/min/1.73m2', ref: '>90' },
    { key: 'uric_acid', label: 'SERUM URIC ACID', unit: 'mg/dL', ref: '3.4 - 7.0' },
    { key: 'calcium', label: 'CALCIUM', unit: 'mg/dL', ref: '8.8-10.6' },
    { key: 'potassium', label: 'POTASSIUM', unit: 'MMOL/L', ref: '3.5 - 5.1' },
    { key: 'sodium', label: 'SODIUM', unit: 'MMOL/L', ref: '136 - 146' },
  ],
  'Lipid Profile': [
    { key: 'total_cholesterol', label: 'CHOLESTEROL -TOTAL', unit: 'mg/dL', ref: 'NON DIABETIC: <200, DIABETIC: <170, CAD: <140' },
    { key: 'hdl', label: 'CHOLESTEROL-HDL', unit: 'mg/dL', ref: '>40: MALES, >50: FEMALES' },
    { key: 'non_hdl', label: 'CHOLESTEROL -NON-HDL', unit: 'mg/dL', ref: 'NON DIABETIC: <160, DIABETIC: <130, CAD: <100' },
    { key: 'ldl', label: 'CHOLESTEROL-LDL', unit: 'mg/dL', ref: 'NON DIABETIC: <130, DIABETIC: <100, CAD: <70' },
    { key: 'vldl', label: 'CHOLESTEROL-VLDL', unit: 'mg/dL', ref: '7 - 40' },
    { key: 'triglycerides', label: 'TRIGLYCERIDES (TGL)', unit: 'mg/dL', ref: '<150: NORMAL, 150-199: BORDERLINE-HIGH, 200-499: HIGH, >500: VERY HIGH' },
    { key: 'tc_hdl_ratio', label: 'TOTAL CHOLESTEROL / HDL RATIO', unit: 'mg/dL', ref: '0-4.0' },
    { key: 'ldl_hdl_ratio', label: 'LDL / HDL RATIO', unit: 'mg/dL', ref: '0-3.5' },
    { key: 'fbs', label: 'FASTING BLOOD SUGAR', unit: 'mgs%', ref: '70-110 mgs%' },
  ],
  'Liver Function Test': [
    { key: 'sgpt_modified', label: 'ASPARTATE AMINOTRANSFERASE(SGOT) (MODIFIED IFCC)', unit: 'U/L', ref: '<40' },
    { key: 'sgot_modified', label: 'ALANINE TRANSAMINASE(SGPT)', unit: 'U/L', ref: '<40' },
    { key: 'alp', label: 'ALKALINE PHOSPHATASE', unit: 'U/L', ref: '30 - 140' },
    { key: 'bilirubin_total', label: 'BILIRUBIN TOTAL', unit: 'mg/dL', ref: '0.8 - 1.3' },
    { key: 'bilirubin_direct', label: 'BILIRUBIN DIRECT', unit: 'mg/dL', ref: '0 - 0.2' },
    { key: 'bilirubin_indirect', label: 'BILIRUBIN INDIRECT', unit: 'mg/dL', ref: '0 - 0.8' },
    { key: 'total_proteins', label: 'TOTAL PROTEINS', unit: 'g/dL', ref: '6.4 - 8.3' },
    { key: 'albumin_bcg', label: 'ALBUMIN(BROMOCRESOL GREEN)', unit: 'gm/dL', ref: '3.5 - 5.0' },
    { key: 'globulin', label: 'GLOBULIN', unit: 'gm/dL', ref: '2.3 - 3.5' },
    { key: 'ag_ratio', label: 'ALBUMIN/GLOBULIN RATIO', unit: 'gm/dL', ref: '1.2-2.2' },
    { key: 'sgot', label: 'SGOT', unit: 'U/L', ref: '15.00-40.00' },
    { key: 'sgpt', label: 'SGPT', unit: 'U/L', ref: '10.00-49.00' },
  ],
  'Malaria': [
    { key: 'igg', label: 'IgG', unit: '', ref: '' },
    { key: 'pf', label: 'PLASMODIUM FALCIPARUM "PF"', unit: '', ref: '' },
    { key: 'pv', label: 'PLASMODIUM VIVAX "PV"', unit: '', ref: '' },
  ],
  'Fasting Blood Sugar': [
    { key: 'fbs', label: 'FASTING BLOOD SUGAR', unit: 'mgs%', ref: '70-120' },
  ],
  'FBS,PPBS': [
    { key: 'fbs', label: 'FASTING BLOOD SUGAR', unit: 'mgS%', ref: '70-120' },
    { key: 'ppbs', label: 'POST PRANDIAL BLOOD SUGAR', unit: 'mgS%', ref: '80-140' },
  ],
  'Random Blood Sugar': [
    { key: 'rbs', label: 'RANDOM BLOOD SUGAR', unit: 'mg/dL', ref: '70-140' },
  ],
  'Serum Proteins': [
    { key: 'total_proteins', label: 'TOTAL PROTEINS', unit: 'mg/dL', ref: '6.4-8.3' },
    { key: 'albumin', label: 'ALBUMIN (BROMOCRESOL GREEN)', unit: 'mg/dL', ref: '3.5-5.0' },
    { key: 'globulin', label: 'GLOBULIN', unit: 'mg/dL', ref: '2.3-3.5' },
    { key: 'ag_ratio', label: 'ALBUMIN/GLOBULIN RATIO', unit: 'mg/dL', ref: '1.2-2.2' },
  ],
  'Thyroid': [
    { key: 't3', label: 'TRIIODOTHYRONINE TOTAL (T3)', unit: 'np/ml', ref: '0.61-1.81' },
    { key: 't4', label: 'THYROXINE-TOTAL (T4)', unit: 'ug/dL', ref: '5.0 - 14.5' },
    { key: 'tsh', label: 'THYROID STIMULATING HORMONE (TSH)', unit: 'uIU/ml', ref: '0.35 - 5.1' },
  ],
  'Complete Urine Analysis': [
    { key: 'colour', label: 'Colour', unit: '', ref: 'yellow/pale yellow' },
    { key: 'appearance', label: 'Appearance', unit: '', ref: 'Clear' },
    { key: 'ph', label: 'REACTION (pH)', unit: '', ref: '5.0-8.0' },
    { key: 'specific_gravity', label: 'SPECIFIC GRAVITY', unit: '', ref: '1.003-1.030' },
    { key: 'glucose', label: 'GLUCOSE', unit: '', ref: 'NIL' },
    { key: 'protein', label: 'PROTEIN', unit: '', ref: 'NIL' },
    { key: 'ketones', label: 'KETONES', unit: '', ref: 'Nil' },
    { key: 'blood_in_urine', label: 'BLOOD IN URINE', unit: '', ref: 'NEGATIVE' },
    { key: 'bile_salts', label: 'BILE SALTS', unit: '', ref: 'NEGATIVE' },
    { key: 'bile_pigments', label: 'BILE PIGMENTS', unit: '', ref: 'NEGATIVE' },
    { key: 'urobilinogen', label: 'UROBILINOGEN', unit: '', ref: 'Nil' },
  ],
  'Widal Test': [
    { key: 'typhi_o', label: 'SALMONELLA TYPHI "O"', unit: '', ref: '1:40 DILL' },
    { key: 'typhi_h', label: 'SALMONELLA TYPHI "H"', unit: '', ref: '1:40 DILL' },
    { key: 'paratyphi_ah', label: 'SALMONELLA PARATYPHI "AH"', unit: '', ref: '1:20 DILL' },
    { key: 'paratyphi_bh', label: 'SALMONELLA PARATYPHI "BH"', unit: '', ref: '1:20 DILL' },
  ],
  'AEC': [
    { key: 'aec', label: 'AEC', unit: '', ref: '0-440' },
  ],
  'Viral Markers': [
    { key: 'hiv', label: 'HIV', unit: '', ref: 'Negative' },
    { key: 'hbsag', label: 'HBSAG', unit: '', ref: 'Negative' },
    { key: 'hcv', label: 'HCV Hepatitise-C Virus', unit: '', ref: 'Negative' },
  ],
  'Blood Group': [
    { key: 'blood_group', label: 'Blood Group', unit: '', ref: '' },
    { key: 'rh_typing', label: 'Rh Typing', unit: '', ref: '' },
  ],
};
const getTestFields = (testName) =>
  TEST_FIELD_TEMPLATES[testName] || [{ key: 'result', label: 'Result', unit: '', ref: '' }];

const signatureSrc = `${window.location.origin}/signature.jpeg`;
const headerSrc = `${window.location.origin}/header.png`;

// ─── Shared print CSS (used by both single-test and full-booking reports) ────
const PRINT_STYLES = `
  @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; background: white; color: #1e293b; line-height: 1.5; }
  .print-page { max-width: 100%; margin: 0 auto; background: white; page-break-after: always; break-after: page; }
  .print-page:last-child { page-break-after: auto; break-after: auto; }
  .print-header { width: 100%; height: 120px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; }
  .print-header img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .print-patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; font-size: 16px; margin-bottom: 20px; padding: 12px 0; border-bottom: 1px dashed #cbd5e1; }
  .print-patient-info p { margin: 4px 0; }
  .print-patient-info strong { color: #0f172a; }
  .print-test-section { margin-bottom: 28px; }
  .print-test-section h4 { font-size: 20px; color: #0f172a; margin: 0 0 12px 0; border-left: 4px solid #3b82f6; padding-left: 12px; }
  .print-results-table { width: 100%; border-collapse: collapse; font-size: 15px; margin-bottom: 14px; }
  .print-results-table th { background: #f1f5f9; color: #0f172a; font-weight: 600; text-align: left; padding: 10px 8px; border: 1px solid #e2e8f0; }
  .print-results-table td { padding: 8px 8px; border: 1px solid #e2e8f0; vertical-align: top; }
  .print-results-table tr:nth-child(even) td { background: #fafbfc; }
  .print-footer { margin-top: 60px; padding-top: 20px; display: flex; justify-content: flex-end; }
  .signature-area { text-align: right; font-size: 16px; }
  .signature-area p { margin: 2px 0; }
  .signature-area strong { color: #0f172a; }
  .signature-area img { max-width: 200px; height: auto; display: block; margin-left: auto; margin-bottom: 4px; }
  @media (max-width: 600px) {
    .print-patient-info { grid-template-columns: 1fr; gap: 4px; }
    .print-results-table { font-size: 13px; }
  }
`;

const patientInfoHtml = (patient, dateStr) => `
  <div class="print-patient-info">
    <p><strong>Patient:</strong> ${escapeHtml(patient?.first_name || '')} ${escapeHtml(patient?.last_name || '')}</p>
    <p><strong>Age / Gender:</strong> ${escapeHtml(patient?.age || '')} / ${escapeHtml(patient?.gender || '')}</p>
    <p><strong>Contact:</strong> ${escapeHtml(patient?.mobile || '')}</p>
    <p><strong>Date:</strong> ${escapeHtml(dateStr)}</p>
  </div>
`;

const signatureHtml = () => `
  <div class="print-footer">
    <div class="signature-area">
      <img src="${signatureSrc}" alt="Signature" />
      <p><strong>Signature:</strong> Dr. Kishore Babu M</p>
      <p>MSC. PHD (Biotechnology)</p>
    </div>
  </div>
`;

// ─── Reference-range parsing + highlight color (mirrors Reporting.jsx) ────
const parseReferenceRange = (ref) => {
  if (!ref || typeof ref !== 'string') return null;
  const s = ref.trim();
  let match = s.match(/\b([\d.]+)\s*-\s*([\d.]+)\b/);
  if (match) {
    return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
  }
  match = s.match(/^\s*([<>])\s*([\d.]+)\s*$/);
  if (match) {
    const val = parseFloat(match[2]);
    if (match[1] === '>') return { min: val, max: Infinity };
    if (match[1] === '<') return { min: -Infinity, max: val };
  }
  return null;
};

const getHighlightColor = (value, ref) => {
  if (value === undefined || value === null || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  const range = parseReferenceRange(ref);
  if (!range) return '';
  if (num > range.max) return 'red';
  if (num < range.min) return 'blue';
  return '';
};

// ─── CHANGED: Accept test object, conditionally show/hide Unit & Reference Range ───
const testResultTableHtml = (test, resultData) => {
  const fields = getTestFields(test.test_name);
  const isMalariaOrDengue = test.test_name === 'Malaria' || test.test_name === 'Dengue';
  const rows = fields.map(f => {
    const value = resultData?.[f.key] || '';
    const color = getHighlightColor(value, f.ref);
    const styleAttr = color ? ` style="color: ${color}; font-weight: bold;"` : '';
    if (isMalariaOrDengue) {
      return `
        <tr>
          <td>${escapeHtml(f.label)}</td>
          <td${styleAttr}>${escapeHtml(value)}</td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td>${escapeHtml(f.label)}</td>
          <td${styleAttr}>${escapeHtml(value)}</td>
          <td>${escapeHtml(f.unit)}</td>
          <td>${escapeHtml(f.ref)}</td>
        </tr>
      `;
    }
  }).join('');

  let headerRow;
  if (isMalariaOrDengue) {
    headerRow = `<tr><th>Investigation</th><th>Result</th></tr>`;
  } else {
    headerRow = `<tr><th>Investigation</th><th>Result</th><th>Units</th><th>Reference Range</th></tr>`;
  }

  return `
    <div class="print-test-section">
      <h4>${escapeHtml(test.test_name)}</h4>
      <table class="print-results-table">
        <thead>${headerRow}</thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

const wrapHtmlDoc = (title, bodyHtml) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

// ─── Main Component ─────────────────────────────────────────────
const ReportManagement = () => {
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [reports, setReports] = useState([]);
  const [testMap, setTestMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings');
  const [debugMsg, setDebugMsg] = useState('');

  // ─── Recent patients ──────────────────────────────────────────
  const [recentPatients, setRecentPatients] = useState(loadRecentPatients);

  // ─── Load test map ──────────────────────────────────────────────
  useEffect(() => {
    getAllTests()
      .then(res => {
        const allTests = res.data || [];
        const map = {};
        allTests.forEach(t => { map[t.id] = t.test_name || 'Unknown'; });
        setTestMap(map);
      })
      .catch(() => {});
  }, []);

  // ─── Debounced patient search ──────────────────────────────────
  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatients([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchPatientsAsTechnician(patientSearch);
        setPatients(Array.isArray(res) ? res : []);
      } catch {
        setPatients([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // ─── Select patient ─────────────────────────────────────────────
  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setPatientSearch('');
    setPatients([]);
    setLoading(true);
    setDebugMsg('Loading bookings...');

    // Add to recent patients
    setRecentPatients(prev => {
      const filtered = prev.filter(p => p.id !== patient.id);
      const updated = [patient, ...filtered].slice(0, MAX_RECENT);
      saveRecentPatients(updated);
      return updated;
    });

    try {
      const bookingsRes = await getAllPatientBookings(patient.id);
      let bookingsData = bookingsRes.data.bookings || [];

      for (let i = 0; i < bookingsData.length; i++) {
        const booking = bookingsData[i];
        if (!booking.tests || booking.tests.length === 0) {
          try {
            const testsRes = await getBookingTests(booking.booking_id);
            booking.tests = testsRes.data.map(item => ({
              id: item.booking_item_id,
              test_name: item.test_name,
              rate: item.rate,
              discount: item.discount,
              final_price: item.final_price,
              report: item.report || null,
            }));
          } catch (err) {
            console.error(`Failed to fetch tests for booking #${booking.booking_id}`, err);
            booking.tests = [];
          }
        }
      }

      const reportsRes = await listReports({ patient_id: patient.id });
      const reportsData = (reportsRes.data || []).filter(
        r => !r.patient_id || r.patient_id === patient.id
      );
      const reportMap = {};
      reportsData.forEach(r => {
        if (r.booking_item_id) reportMap[r.booking_item_id] = r;
      });
      bookingsData.forEach(booking => {
        (booking.tests || []).forEach(test => {
          test.report = reportMap[test.id] || null;
        });
      });

      setBookings(bookingsData);
      setReports(reportsData);
      setDebugMsg(`Loaded ${bookingsData.length} booking(s), ${reportsData.length} report(s).`);
      setActiveTab('bookings');
    } catch (err) {
      console.error(err);
      setDebugMsg('❌ Error: ' + err.message);
      alert('Failed to load data for this patient.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setBookings([]);
    setReports([]);
    setDebugMsg('');
  };

  const handleRefresh = () => {
    if (selectedPatient) handlePatientSelect(selectedPatient);
  };

  // ─── Find the booking + test that a given report row belongs to ────
  const findBookingAndTestForReport = (report) => {
    for (const booking of bookings) {
      const test = (booking.tests || []).find(t => t.id === report.booking_item_id);
      if (test) return { booking, test };
    }
    return { booking: null, test: null };
  };

  // ─── Build HTML for a single test's report (Reports tab) ───────────
  const buildSingleReportHtml = (report) => {
    const { test } = findBookingAndTestForReport(report);
    const testName = test?.test_name || testMap[report.test_id] || report.test_name || 'Test';
    const fakeTest = { test_name: testName };
    const dateStr = report.report_date ? new Date(report.report_date).toLocaleDateString() : new Date().toLocaleDateString();

    const body = `
      <section class="print-page">
        <div class="print-header"><img src="${headerSrc}" alt="CareDx Lab Report Header" /></div>
        ${patientInfoHtml(selectedPatient, dateStr)}
        ${testResultTableHtml(fakeTest, report.result_data)}
        ${signatureHtml()}
      </section>
    `;
    return wrapHtmlDoc(`Lab Report - ${selectedPatient?.first_name || ''} ${selectedPatient?.last_name || ''}`, body);
  };

  // ─── Build HTML for an ENTIRE booking: one full page PER reported test ──
  const buildBookingReportHtml = (booking, showHeader = true) => {
    const testsWithReports = (booking.tests || []).filter(t => t.report && t.report.result_data);
    if (testsWithReports.length === 0) return null;

    const dateStr = new Date().toLocaleDateString();
    const headerHtml = showHeader
      ? `<div class="print-header"><img src="${headerSrc}" alt="CareDx Lab Report Header" /></div>`
      : '';

    const pages = testsWithReports
      .map(t => `
        <section class="print-page">
          ${headerHtml}
          ${patientInfoHtml(selectedPatient, dateStr)}
          ${testResultTableHtml(t, t.report.result_data)}
          ${signatureHtml()}
        </section>
      `)
      .join('');

    return wrapHtmlDoc(
      `Lab Report - ${selectedPatient?.first_name || ''} ${selectedPatient?.last_name || ''} - Booking #${booking.booking_id}`,
      pages
    );
  };

  // ─── Print / view helpers ────────────────────────────────────────
  const printHtmlInIframe = (html) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    const images = iframeDoc.querySelectorAll('img');
    let loadedCount = 0;
    const totalImages = images.length;
    const triggerPrint = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
    if (totalImages === 0) {
      triggerPrint();
    } else {
      images.forEach(img => {
        const onDone = () => {
          loadedCount++;
          if (loadedCount === totalImages) triggerPrint();
        };
        if (img.complete) onDone();
        else { img.onload = onDone; img.onerror = onDone; }
      });
    }
    iframe.contentWindow.onafterprint = () => document.body.removeChild(iframe);
  };

  const handleViewReport = (report) => {
    const html = buildSingleReportHtml(report);
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) { alert('Please allow pop-ups.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  const handleDownloadReport = (report) => {
    const html = buildSingleReportHtml(report);
    printHtmlInIframe(html);
  };

  const handleViewBookingReport = (booking) => {
    const html = buildBookingReportHtml(booking);
    if (!html) { alert('No saved results for this booking yet.'); return; }
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) { alert('Please allow pop-ups.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  const handleDownloadBookingReport = (booking) => {
    const html = buildBookingReportHtml(booking);
    if (!html) { alert('No saved results for this booking yet.'); return; }
    printHtmlInIframe(html);
  };

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="report-management-container">
      <h2>📋 Report & Billing Management</h2>

      <div className="patient-search-section">
        <label className="search-label">Search Patient:</label>
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Type patient name, ID, or mobile..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="patient-search-input"
          />
          {patients.length > 0 && (
            <ul className="patient-search-results">
              {patients.map(p => (
                <li key={p.id} onClick={() => handlePatientSelect(p)}>
                  {p.first_name} {p.last_name} ({p.patient_id}) - {p.mobile}
                </li>
              ))}
            </ul>
          )}
          {/* ─── CHANGED: Show recent patients when no search query ─── */}
          {!patientSearch && !selectedPatient && recentPatients.length > 0 && (
            <div className="recent-patients">
              <div className="recent-label">🕒 Recent Patients</div>
              <ul className="recent-list">
                {recentPatients.map(p => (
                  <li key={p.id} onClick={() => handlePatientSelect(p)}>
                    {p.first_name} {p.last_name} ({p.patient_id})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {selectedPatient && (
        <div className="selected-patient-info">
          <h3>
            {selectedPatient.first_name} {selectedPatient.last_name}
            <button className="clear-btn" onClick={handleClearPatient}>✕</button>
            <button className="refresh-btn" onClick={handleRefresh}>🔄 Refresh</button>
          </h3>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
              📋 Bookings ({bookings.length})
            </button>
            <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
              📄 Reports ({reports.length})
            </button>
          </div>
          {debugMsg && <div className="debug-msg">{debugMsg}</div>}
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      {!loading && selectedPatient && activeTab === 'bookings' && (
        <>
          {bookings.length === 0 ? (
            <div className="no-reports">No bookings found for this patient.</div>
          ) : (
            <div className="bookings-list">
              {bookings.map(booking => {
                const reportedCount = (booking.tests || []).filter(t => t.report && t.report.result_data).length;
                return (
                  <div key={booking.booking_id} className="booking-card">
                    <div className="booking-header">
                      <h4>Booking #{booking.booking_id}</h4>
                      <span className={`status-badge status-${booking.status?.toLowerCase() || 'unknown'}`}>
                        {booking.status || 'Unknown'}
                      </span>
                      <span className="booking-date">{new Date(booking.booking_date).toLocaleDateString()}</span>
                    </div>
                    <div className="booking-details">
                      <p><strong>Total:</strong> ₹{booking.total_amount?.toFixed(2) || '0.00'}</p>
                      <p><strong>Paid:</strong> ₹{booking.paid_amount?.toFixed(2) || '0.00'}</p>
                      <p><strong>Balance:</strong> ₹{booking.balance?.toFixed(2) || '0.00'}</p>
                      <p><strong>Payment Mode:</strong> {booking.payment_mode || 'N/A'}</p>
                    </div>
                    <div className="booking-tests">
                      <h5>Tests:</h5>
                      {booking.tests && booking.tests.length > 0 ? (
                        <ul>
                          {booking.tests.map(test => (
                            <li key={test.id}>
                              <div className="test-item">
                                <span className="test-name">{test.test_name}</span>
                                <span className="test-price">₹{test.final_price?.toFixed(2) || '0.00'}</span>
                              </div>
                              {test.report && test.report.result_data ? (
                                <div className="report-data">
                                  <span className="report-status">Status: {test.report.status || 'Saved'}</span>
                                  <div className="report-values">
                                    {Object.entries(test.report.result_data)
                                      .filter(([key]) => key !== 'notes')
                                      .map(([key, val]) => (
                                        <span key={key} className="report-value-item">{key}: {val}</span>
                                      ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="report-status pending">⏳ No result saved yet</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-tests">⚠️ No tests in this booking.</p>
                      )}
                    </div>
                    {reportedCount > 0 && (
                      <div className="booking-actions">
                        <button className="action-btn view-btn" onClick={() => handleViewBookingReport(booking)}>
                          👁️ View Full Report ({reportedCount})
                        </button>
                        <button className="action-btn download-btn" onClick={() => handleDownloadBookingReport(booking)}>
                          ⬇️ Download PDF
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!loading && selectedPatient && activeTab === 'reports' && (
        <>
          {reports.length === 0 ? (
            <div className="no-reports">No reports found for this patient.</div>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Test Name</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => (
                  <tr key={report.id}>
                    <td>{report.id}</td>
                    <td>{testMap[report.test_id] || report.test_name || 'N/A'}</td>
                    <td>{report.report_date ? new Date(report.report_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-${report.status?.toLowerCase() || 'unknown'}`}>
                        {report.status || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn view-btn" onClick={() => handleViewReport(report)}>👁️ View</button>
                      <button className="action-btn download-btn" onClick={() => handleDownloadReport(report)}>⬇️ Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default ReportManagement;