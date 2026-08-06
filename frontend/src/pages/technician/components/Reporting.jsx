import React, { useState, useEffect, useRef } from 'react';
import { 
  searchPatientsAsTechnician, 
  getPatientBookings,
  saveReport 
} from '../../../api/technician';
import './Reporting.css';

const Reporting = () => {
  // ---- Patient search ----
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // ---- Bookings ----
  const [bookings, setBookings] = useState([]);
  const [selectedBookingOption, setSelectedBookingOption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ---- Results ----
  const [results, setResults] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef();

  // ---- Debounced patient search ----
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      searchPatientsAsTechnician(searchQuery)
        .then(results => {
          setSearchResults(Array.isArray(results) ? results : []);
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ---- Select patient → fetch all bookings ----
  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setSearchResults([]);
    setError('');
    setSuccess('');
    setBookings([]);
    setSelectedBookingOption('');
    setResults({});
    setIsPrinting(false);
    setLoading(true);

    try {
      const res = await getPatientBookings(patient.id);
      const data = res.data;
      if (data.bookings && data.bookings.length > 0) {
        setBookings(data.bookings);
        setSelectedBookingOption('all');
        const init = {};
        data.bookings.forEach(b => {
          b.tests.forEach(t => {
            init[t.id] = {};
            const fields = getTestFields(t.test_name);
            fields.forEach(f => { init[t.id][f.key] = ''; });
            init[t.id].notes = '';
          });
        });
        setResults(init);
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
    setError('');
    setSuccess('');
    setIsPrinting(false);
  };

  // ---- Handle result changes ----
  const handleResultChange = (testId, field, value) => {
    setResults(prev => ({
      ...prev,
      [testId]: { ...prev[testId], [field]: value }
    }));
  };

  // ---- Get all selected tests ----
  const getSelectedTests = () => {
    if (!selectedBookingOption || bookings.length === 0) return [];
    if (selectedBookingOption === 'all') {
      let allTests = [];
      bookings.forEach(b => allTests = allTests.concat(b.tests));
      return allTests;
    } else {
      const booking = bookings.find(b => b.booking_id === parseInt(selectedBookingOption));
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
        const reportData = {
          booking_item_id: test.id,
          result_data: results[test.id] || {},
          status: 'Draft',
          report_date: new Date().toISOString().slice(0, 10),
        };
        await saveReport(reportData);
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

  // ---- Submit all for Approval ----
  const handleSubmitAll = async () => {
    const tests = getSelectedTests();
    if (!tests.length) {
      alert('No tests to submit.');
      return;
    }
    setSavingAll(true);
    setError('');
    setSuccess('');
    try {
      for (const test of tests) {
        const reportData = {
          booking_item_id: test.id,
          result_data: results[test.id] || {},
          status: 'Pending',
          report_date: new Date().toISOString().slice(0, 10),
        };
        await saveReport(reportData);
      }
      setSuccess('All tests submitted for approval.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to submit all reports.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSavingAll(false);
    }
  };

  // ---- Print all tests (each on its own page) ----
  const handlePrintAll = () => {
    const tests = getSelectedTests();
    if (!tests.length) {
      alert('No tests to print.');
      return;
    }
    setIsPrinting(true);
    // Wait for the print view to render, then trigger print
    setTimeout(() => {
      window.print();
    }, 400);
    // Reset printing flag after print dialog closes (or after a delay)
    setTimeout(() => {
      setIsPrinting(false);
    }, 5000);
  };

  // ---- Helper: test field templates (all tests) ----
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
      'Blood Report': [
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
    return templates[testName] || [{ key: 'result', label: 'Result', unit: '', ref: '' }];
  };

  // ---- Print view component (each test on its own page) ----
  const PrintReport = () => {
    const tests = getSelectedTests();
    return (
      <div className="print-container" ref={printRef}>
        {selectedPatient && tests.map((test, index) => {
          const fields = getTestFields(test.test_name);
          return (
            <div key={test.id} className="print-page">
              <div className="print-header">
                <div className="print-logo">🏥 CareDx</div>
                <div className="print-title">Lab Report</div>
              </div>
              <div className="print-patient-info">
                <p><strong>Patient:</strong> {selectedPatient.first_name} {selectedPatient.last_name}</p>
                <p><strong>Age / Gender:</strong> {selectedPatient.age} / {selectedPatient.gender}</p>
                <p><strong>Contact:</strong> {selectedPatient.mobile}</p>
                <p><strong>City:</strong> {selectedPatient.city || 'N/A'}</p>
                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              </div>
              <div className="print-test-section">
                <h4>{test.test_name}</h4>
                <table className="print-results-table">
                  <thead>
                    <tr>
                      <th>Investigation</th>
                      <th>Result</th>
                      <th>Units</th>
                      <th>Reference Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map(field => (
                      <tr key={field.key}>
                        <td>{field.label}</td>
                        <td>{results[test.id]?.[field.key] || ''}</td>
                        <td>{field.unit}</td>
                        <td>{field.ref}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="print-notes">
                  <strong>Notes:</strong> {results[test.id]?.notes || ''}
                </div>
              </div>
              <div className="print-footer">
                <div className="signature-area">
                  <p><strong>Signature:</strong> Dr. Kishore Babu M</p>
                  <p>MSC. PHD (Biotechnology)</p>
                </div>
              </div>
              {/* Page break after each test except the last */}
              {index < tests.length - 1 && <div className="page-break" />}
            </div>
          );
        })}
        {/* Print action button (only visible in print preview) */}
        <div className="print-actions">
          <button onClick={() => window.print()}>🖨️ Print / PDF</button>
        </div>
      </div>
    );
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
                {searchResults.map(p => (
                  <li key={p.id} onClick={() => handlePatientSelect(p)}>
                    {p.first_name} {p.last_name} ({p.patient_id}) - {p.mobile}
                  </li>
                ))}
              </ul>
            )}
            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="no-results">No patients found</div>
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
                // Re‑initialize results for the new selection
                const init = {};
                let allTests = [];
                if (e.target.value === 'all') {
                  bookings.forEach(b => allTests = allTests.concat(b.tests));
                } else {
                  const booking = bookings.find(b => b.booking_id === parseInt(e.target.value));
                  if (booking) allTests = booking.tests;
                }
                allTests.forEach(t => {
                  init[t.id] = {};
                  const fields = getTestFields(t.test_name);
                  fields.forEach(f => { init[t.id][f.key] = ''; });
                  init[t.id].notes = '';
                });
                setResults(init);
                setIsPrinting(false);
              }}
              className="booking-select"
            >
              <option value="">-- Choose --</option>
              <option value="all">📌 Combine All</option>
              {bookings.map(b => (
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
              {selectedTests.map(test => {
                const fields = getTestFields(test.test_name);
                return (
                  <div key={test.id} className="test-entry">
                    <h4>{test.test_name}</h4>
                    <div className="fields-grid">
                      {fields.map(field => (
                        <div key={field.key} className="field-group">
                          <label>{field.label}</label>
                          <input
                            type="text"
                            value={results[test.id]?.[field.key] || ''}
                            onChange={(e) => handleResultChange(test.id, field.key, e.target.value)}
                            placeholder={`Enter ${field.label}`}
                          />
                          <span className="field-unit">{field.unit}</span>
                          <small className="field-ref">{field.ref}</small>
                        </div>
                      ))}
                      <div className="field-group full-width">
                        <label>Notes</label>
                        <textarea
                          value={results[test.id]?.notes || ''}
                          onChange={(e) => handleResultChange(test.id, 'notes', e.target.value)}
                          placeholder="Additional notes..."
                          rows="2"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Global Action Buttons */}
              <div className="global-actions">
                <button
                  onClick={handleSaveAllDraft}
                  disabled={savingAll}
                  className="action-btn draft-btn"
                >
                  {savingAll ? 'Saving...' : '💾 Save All Draft'}
                </button>
                <button
                  onClick={handleSubmitAll}
                  disabled={savingAll}
                  className="action-btn submit-btn"
                >
                  {savingAll ? 'Submitting...' : '📤 Submit All for Approval'}
                </button>
                <button
                  onClick={handlePrintAll}
                  className="action-btn print-btn"
                >
                  🖨️ Preview & Print All
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

      {/* Print View (hidden unless printing) */}
      {isPrinting && <PrintReport />}
    </div>
  );
};

export default Reporting;