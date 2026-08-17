import React, { useState, useEffect } from 'react';
import {
  searchPatientsAsTechnician,
  getAllPatientBookings,
  listReports,
  saveReport,
} from '../../../api/technician';
import './Reporting.css';

const signatureSrc = `${window.location.origin}/signature.jpeg`;

// ─── Helper: load/save recent patients ──────────────────────────
const RECENT_KEY = 'recentPatients_technician';
const MAX_RECENT = 10;

const loadRecentPatients = () => {
  try {
    const data = localStorage.getItem(RECENT_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveRecentPatients = (list) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
};

// ─── Dedupe helper ──────────────────────────────────────────────
const dedupeArray = (arr) => Array.from(new Set(arr));

const Reporting = () => {
  // ---- Patient search ----
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // ---- Recent patients ----
  const [recentPatients, setRecentPatients] = useState(loadRecentPatients);

  // ---- Bookings ----
  const [bookings, setBookings] = useState([]);
  const [selectedBookingOption, setSelectedBookingOption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ---- Results ----
  const [results, setResults] = useState({});
  const [savingAll, setSavingAll] = useState(false);

  // ---- Reports map (booking_item_id -> report object) ----
  const [reportsMap, setReportsMap] = useState({});

  // ---- Editing state (test.id -> boolean) ----
  const [editingState, setEditingState] = useState({});

  // ---- Helper: parse reference range ----
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

  // ---- Debounced patient search ----
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      searchPatientsAsTechnician(searchQuery)
        .then((results) => {
          setSearchResults(Array.isArray(results) ? results : []);
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ---- Fetch existing reports for a patient ----
  const fetchReportsForPatient = async (patientId) => {
    try {
      const res = await listReports({ patient_id: patientId });
      const reports = res.data || [];
      const map = {};
      reports.forEach((r) => {
        if (r.booking_item_id) {
          map[r.booking_item_id] = r;
        }
      });
      setReportsMap(map);
      return map;
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      return {};
    }
  };

  // ---- Select patient → fetch bookings and reports ----
  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setSearchResults([]);
    setError('');
    setSuccess('');
    setBookings([]);
    setSelectedBookingOption('');
    setResults({});
    setEditingState({});
    setLoading(true);

    // Add to recent patients
    setRecentPatients((prev) => {
      const filtered = prev.filter((p) => p.id !== patient.id);
      const updated = [patient, ...filtered].slice(0, MAX_RECENT);
      saveRecentPatients(updated);
      return updated;
    });

    try {
      const [bookingsRes, reportsMap] = await Promise.all([
        getAllPatientBookings(patient.id),
        fetchReportsForPatient(patient.id),
      ]);

      const data = bookingsRes.data;
      if (data.bookings && data.bookings.length > 0) {
        setBookings(data.bookings);
        setSelectedBookingOption('all');

        const init = {};
        const editState = {};
        data.bookings.forEach((b) => {
          b.tests.forEach((t) => {
            const report = reportsMap[t.id];
            init[t.id] = {};
            const fields = getTestFields(t.test_name);
            fields.forEach((f) => {
              if (report && report.result_data && report.result_data[f.key] !== undefined) {
                init[t.id][f.key] = report.result_data[f.key] || '';
              } else {
                init[t.id][f.key] = '';
              }
            });
            init[t.id].notes = report?.result_data?.notes || '';
            editState[t.id] = !report;
          });
        });
        setResults(init);
        setEditingState(editState);
      } else {
        setError('No bookings found for this patient.');
      }
    } catch (err) {
      setError('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setBookings([]);
    setSelectedBookingOption('');
    setResults({});
    setReportsMap({});
    setEditingState({});
    setError('');
    setSuccess('');
  };

  // ---- Handle result changes ----
  const handleResultChange = (testId, field, value) => {
    setResults((prev) => ({
      ...prev,
      [testId]: { ...prev[testId], [field]: value },
    }));
  };

  // ---- Toggle edit mode ----
  const toggleEdit = (testId) => {
    setEditingState((prev) => ({
      ...prev,
      [testId]: !prev[testId],
    }));
  };

  // ---- Save a single report ----
  const saveSingleReport = async (test, status) => {
    try {
      const reportData = {
        booking_item_id: test.id,
        result_data: results[test.id] || {},
        status: status,
        report_date: new Date().toISOString().slice(0, 10),
      };
      const res = await saveReport(reportData);
      const newReport = res.data || { id: res.report_id, ...reportData };
      setReportsMap((prev) => ({
        ...prev,
        [test.id]: newReport,
      }));
      setEditingState((prev) => ({
        ...prev,
        [test.id]: false,
      }));
      setSuccess(`✅ ${test.test_name} saved as ${status}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Failed to save ${test.test_name}.`);
      setTimeout(() => setError(''), 3000);
    }
  };

  // ---- Get all selected tests ----
  const getSelectedTests = () => {
    if (!selectedBookingOption || bookings.length === 0) return [];
    if (selectedBookingOption === 'all') {
      let allTests = [];
      bookings.forEach((b) => (allTests = allTests.concat(b.tests)));
      return allTests;
    } else {
      const booking = bookings.find(
        (b) => b.booking_id === parseInt(selectedBookingOption)
      );
      return booking ? booking.tests : [];
    }
  };

  // ---- Save all as Draft ----
  const handleSaveAllDraft = async () => {
    const tests = getSelectedTests();
    if (!tests.length) {
      alert('No tests to save.');
      return;
    }
    setSavingAll(true);
    setError('');
    setSuccess('');
    try {
      for (const test of tests) {
        await saveSingleReport(test, 'Draft');
      }
      setSuccess('All tests saved as Draft.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save all reports.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSavingAll(false);
    }
  };

  // ---- Print a single test report ----
  const handlePrintSingle = (test) => {
    if (!selectedPatient) return;
    const html = buildPrintHtml([test], true);
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
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    iframe.contentWindow.onafterprint = () => document.body.removeChild(iframe);
  };

  // ---- Helper: test field templates ----
  const getTestFields = (testName) => {
    const templates = {
      'Basic Diabetic Profile': [
        { key: 'hba1c', label: 'Glycosylated Hemoglobin (HbA1c)', unit: '%', ref: '<6: Non Diabetic, 6-7: Good Control, 7-8: Weak Control, >8: Poor Control' },
        { key: 'avg_glucose', label: 'Average Blood Glucose', unit: 'mg/dL', ref: '70-140' },
        { key: 'cholesterol_total', label: 'Cholesterol - Total', unit: 'mg/dL', ref: 'Non Diabetic: <200, Diabetic: <170, CAD: <140' },
        { key: 'serum_creatinine', label: 'Serum Creatinine', unit: 'mg/dL', ref: '0.72-1.18' },
        { key: 'urine_sugar', label: 'Urine Sugar', unit: 'mg/dL', ref: '0.6-1.4' },
        { key: 'urine_proteins', label: 'Urine Proteins', unit: 'NIL', ref: 'NIL' },
      ],
      'Blood Report': [{ key: 'crp', label: 'C.R.P', unit: 'mg/dL', ref: '0 - 6.0 Mg/L' }],
      CRP: [{ key: 'crp', label: 'C.R.P', unit: 'mg/dL', ref: '0 - 6.0 Mg/L' }],
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
      Dengue: [
        { key: 'igg', label: 'IgG', unit: '', ref: '' },
        { key: 'igm', label: 'IgM', unit: '', ref: '' },
        { key: 'ns1', label: 'NS1 Ag', unit: '', ref: '' },
        { key: 'mp', label: 'MP', unit: '', ref: '' },
      ],
      Electrolytes: [
        { key: 'sodium', label: 'SERUM SODIUM', unit: 'mmol/L', ref: '135 - 145' },
        { key: 'potassium', label: 'SERUM POTASSIUM', unit: 'mmol/L', ref: '3.8 - 5.2' },
        { key: 'calcium', label: 'SERUM CALCIUM', unit: 'mg/dL', ref: '8.0 - 10.2' },
        { key: 'chloride', label: 'SERUM CHLORIDE', unit: 'mmol/L', ref: '98 - 108' },
      ],
      HbA1c: [
        { key: 'hba1c', label: 'GLYCOSYLATED HEMOGLOBIN (HbA1c)', unit: '%', ref: '4.0-6.0' },
        { key: 'avg_glucose', label: 'AVERAGE BLOOD GLUCOSE', unit: 'mg/dL', ref: '90-120' },
      ],
      Hemoglobin: [{ key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', ref: '13-17' }],
      Kidney: [
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
      Malaria: [
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
      Thyroid: [
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
      AEC: [{ key: 'aec', label: 'AEC', unit: '', ref: '0-440' }],
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
    return templates[testName] || [{ key: 'result', label: 'Result', unit: '', ref: '' }];
  };

  // ---- Escape helper ----
  const escapeHtml = (val) =>
    String(val ?? '').replace(/[&<>"']/g, (c) => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return map[c];
    });

  // ---- Build print HTML ----
  const buildPrintHtml = (tests, showHeader = true) => {
    const headerSrc = `${window.location.origin}/header.png`;
    const signatureSrc = `${window.location.origin}/signature.jpeg`;

    const pages = tests
      .map((test) => {
        const fields = getTestFields(test.test_name);
        const isMalariaOrDengue = test.test_name === 'Malaria' || test.test_name === 'Dengue';
        const rows = fields
          .map((f) => {
            const value = results[test.id]?.[f.key] || '';
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
          })
          .join('');

        let headerRow;
        if (isMalariaOrDengue) {
          headerRow = `<tr><th>Investigation</th><th>Result</th></tr>`;
        } else {
          headerRow = `<tr><th>Investigation</th><th>Result</th><th>Units</th><th>Reference Range</th></tr>`;
        }

        const headerHtml = `
          <div class="print-header">
            ${showHeader ? `<img src="${headerSrc}" alt="CareDx Lab Report Header" />` : ''}
          </div>
        `;

        return `
          <section class="print-page">
            ${headerHtml}
            <div class="print-patient-info">
              <p><strong>Patient:</strong> ${escapeHtml(selectedPatient.first_name)} ${escapeHtml(selectedPatient.last_name)}</p>
              <p><strong>Age / Gender:</strong> ${escapeHtml(selectedPatient.age)} / ${escapeHtml(selectedPatient.gender)}</p>
              <p><strong>Contact:</strong> ${escapeHtml(selectedPatient.mobile)}</p>
              <p><strong>City:</strong> ${escapeHtml(selectedPatient.city || 'N/A')}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="print-test-section">
              <h4>${escapeHtml(test.test_name)}</h4>
              <table class="print-results-table">
                <thead>${headerRow}</thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
            <div class="print-footer">
              <div class="signature-area">
                <img src="${signatureSrc}" alt="Signature" style="max-width: 200px; height: auto; display: block; margin-left: auto; margin-bottom: 4px;" />
                <p><strong>Signature:</strong> Dr. Kishore Babu M</p>
                <p>MSC. PHD (Biotechnology)</p>
              </div>
            </div>
          </section>
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Lab Report - ${escapeHtml(selectedPatient.first_name)} ${escapeHtml(selectedPatient.last_name)}</title>
<style>
  @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; background: white; color: #1e293b; line-height: 1.5; }
  .print-page { max-width: 100%; margin: 0 auto; background: white; page-break-after: always; break-after: page; }
  .print-page:last-child { page-break-after: auto; break-after: auto; }
  .print-header { width: 100%; height: 120px; margin-bottom: 20px; background: #ffffff; display: flex; align-items: center; justify-content: center; }
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
  .print-footer { margin-top: 180px; padding-top: 20px; display: flex; justify-content: flex-end; }
  .signature-area { text-align: right; font-size: 16px; }
  .signature-area p { margin: 2px 0; }
  .signature-area strong { color: #0f172a; }
  @media print { body { background: white; } .print-page { box-shadow: none; } }
  @media (max-width: 600px) { .print-patient-info { grid-template-columns: 1fr; gap: 4px; } .print-results-table { font-size: 13px; } }
</style>
</head>
<body>
${pages}
</body>
</html>`;
  };

  // ---- Print all ----
  const handlePrintAll = () => {
    const tests = getSelectedTests();
    if (!tests.length) {
      alert('No tests to print.');
      return;
    }
    if (!selectedPatient) {
      alert('No patient selected.');
      return;
    }

    const html = buildPrintHtml(tests);
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

    if (totalImages === 0) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      images.forEach((img) => {
        if (img.complete) {
          loadedCount++;
          if (loadedCount === totalImages) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        } else {
          img.onload = () => {
            loadedCount++;
            if (loadedCount === totalImages) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
          };
          img.onerror = () => {
            loadedCount++;
            if (loadedCount === totalImages) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
          };
        }
      });
    }

    iframe.contentWindow.onafterprint = () => {
      document.body.removeChild(iframe);
    };
  };

  // ---- Render ----
  const selectedTests = getSelectedTests();
  const hasTests = selectedTests && selectedTests.length > 0;

  return (
    <div className="reporting-container">
      <div className="reporting-header">
        <h2>📄 Reporting</h2>
        <p>Search patient, select a booking, enter test results, and generate printable reports.</p>
      </div>

      {/* Patient Selection */}
      <section className="patient-section">
        <label className="section-label">👤 Patient</label>
        {selectedPatient ? (
          <div className="selected-patient">
            <span>
              <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong>
              <span className="patient-meta">
                (ID: {selectedPatient.patient_id} | {selectedPatient.mobile})
              </span>
            </span>
            <button className="clear-btn" onClick={handleClearPatient}>✕</button>
          </div>
        ) : (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search patient by name, ID, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {isSearching && <span className="search-spinner">⏳</span>}
            {searchResults.length > 0 && (
              <ul className="search-results">
                {searchResults.map((p) => (
                  <li key={p.id} onClick={() => handlePatientSelect(p)}>
                    {p.first_name} {p.last_name} ({p.patient_id}) - {p.mobile}
                  </li>
                ))}
              </ul>
            )}
            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="no-results">No patients found</div>
            )}

            {!searchQuery && recentPatients.length > 0 && (
              <div className="recent-patients">
                <div className="recent-label">🕒 Recent Patients</div>
                <ul className="recent-list">
                  {recentPatients.map((p) => (
                    <li key={p.id} onClick={() => handlePatientSelect(p)}>
                      {p.first_name} {p.last_name} ({p.patient_id})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Booking Selection */}
      {selectedPatient && bookings.length > 0 && (
        <section className="booking-select-section">
          <label className="section-label">📋 Select Booking</label>
          <div className="booking-select-group">
            <select
              value={selectedBookingOption}
              onChange={(e) => {
                setSelectedBookingOption(e.target.value);
                const init = {};
                let allTests = [];
                if (e.target.value === 'all') {
                  bookings.forEach((b) => (allTests = allTests.concat(b.tests)));
                } else {
                  const booking = bookings.find(
                    (b) => b.booking_id === parseInt(e.target.value)
                  );
                  if (booking) allTests = booking.tests;
                }
                allTests.forEach((t) => {
                  init[t.id] = {};
                  const fields = getTestFields(t.test_name);
                  fields.forEach((f) => {
                    const report = reportsMap[t.id];
                    if (report && report.result_data && report.result_data[f.key] !== undefined) {
                      init[t.id][f.key] = report.result_data[f.key];
                    } else {
                      init[t.id][f.key] = '';
                    }
                  });
                  init[t.id].notes = reportsMap[t.id]?.result_data?.notes || '';
                });
                setResults(init);
              }}
              className="booking-select"
            >
              <option value="">-- Choose --</option>
              <option value="all">📌 Combine All</option>
              {bookings.map((b) => (
                <option key={b.booking_id} value={b.booking_id}>
                  # {b.booking_id} ({b.status}) - {new Date(b.booking_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* Tests & Results Entry */}
      {selectedPatient && (
        <section className="tests-section">
          {loading ? (
            <p>Loading bookings...</p>
          ) : error ? (
            <div className="reporting-error">{error}</div>
          ) : hasTests ? (
            <>
              <h3>
                {selectedBookingOption === 'all'
                  ? 'All Tests (Combined)'
                  : `Tests for Booking #${selectedBookingOption}`}
              </h3>
              {selectedTests.map((test) => {
                const fields = getTestFields(test.test_name);
                const isMalariaOrDengue = test.test_name === 'Malaria' || test.test_name === 'Dengue';
                const report = reportsMap[test.id];
                const hasReport = !!report;
                const isEditing = editingState[test.id] ?? !hasReport;
                const reportStatus = report?.status || '';

                return (
                  <div key={test.id} className="test-entry">
                    <div className="test-header">
                      <h4>{test.test_name}</h4>
                      <div className="test-status">
                        {hasReport && (
                          <span className={`status-badge status-${reportStatus.toLowerCase()}`}>
                            {reportStatus}
                          </span>
                        )}
                        {!hasReport && (
                          <span className="status-badge status-draft">Not Started</span>
                        )}
                      </div>
                    </div>
                    <div className="fields-grid">
                      {fields.map((field) => {
                        const value = results[test.id]?.[field.key] || '';
                        const color = getHighlightColor(value, field.ref);
                        const inputStyle = color ? { color } : {};
                        return (
                          <div key={field.key} className="field-group">
                            <label>{field.label}</label>
                            <input
                              type="text"
                              value={value}
                              onChange={(e) =>
                                handleResultChange(test.id, field.key, e.target.value)
                              }
                              placeholder={`Enter ${field.label}`}
                              style={inputStyle}
                              disabled={!isEditing}
                              className={!isEditing ? 'field-disabled' : ''}
                            />
                            {!isMalariaOrDengue && (
                              <>
                                <span className="field-unit">{field.unit}</span>
                                <small className="field-ref">{field.ref}</small>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Per‑test actions */}
                    <div className="test-actions">
                      {hasReport && (
                        <button
                          className="action-btn download-btn"
                          onClick={() => handlePrintSingle(test)}
                        >
                          📄 Download
                        </button>
                      )}
                      {isEditing ? (
                        <>
                          <button
                            className="action-btn draft-btn"
                            onClick={() => saveSingleReport(test, 'Draft')}
                          >
                            💾 Save Draft
                          </button>
                          <button
                            className="action-btn submit-btn"
                            onClick={() => saveSingleReport(test, 'Pending')}
                          >
                            📤 Submit
                          </button>
                        </>
                      ) : (
                        <button
                          className="action-btn edit-btn"
                          onClick={() => toggleEdit(test.id)}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ─── Global Actions: only two buttons ──────────── */}
              <div className="global-actions">
                <button onClick={handleSaveAllDraft} disabled={savingAll} className="action-btn draft-btn">
                  {savingAll ? 'Saving...' : '💾 Save All Draft'}
                </button>
                <button onClick={handlePrintAll} className="action-btn print-btn">
                  📄 Download All
                </button>
              </div>

              {success && <div className="reporting-success">{success}</div>}
              {error && <div className="reporting-error">{error}</div>}
            </>
          ) : (
            <p>No tests found for this patient. Please book tests first.</p>
          )}
        </section>
      )}
    </div>
  );
};

export default Reporting;