<script>
    let riwayatData = [];
    function showPage(pageId) {
      document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
        });
      document.getElementById(pageId).classList.add('active');
        if(pageId === 'percobaan') {
          window.dispatchEvent(new Event('resize'));
        }
    }

    const firebaseConfig = {
      apiKey: "AIzaSyBTe7LITbfra1GB-lnvvrKXS1_GNU86hCQ",
      databaseURL: "https://iot-moment-of-inertia-timer-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "iot-moment-of-inertia-timer"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    let chartWaktu, chartKecepatan, chartIEks, chartITeo;
    let lastEntryId = 0;

    function speak(text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      speechSynthesis.speak(utterance);
    }

    async function kirimPilihan() {
      const jenis = document.getElementById('jenisBenda').value;
      db.ref('control/jenisBenda').set(parseInt(jenis));
      speak("Jenis Benda sudah dikirm");
    }

    async function resetParameterManual() {
  await db.ref('control/massa').remove();
  await db.ref('control/jarijari').remove();
  speak("Parameter manual dihapus, kembali ke nilai default benda");
  document.getElementById('inputMassa').value = '';
  document.getElementById('inputJari').value = '';
}

    async function mulaiProgram() {
      db.ref('control/start').set(1);
      speak("Alat sudah siap, lepaskan benda dari atas ramp");
    }

    async function resetESP() {
      db.ref('control/reset').set(1);
      speak("Alat sedang direset");
    }
    function downloadCSV() {
      if (riwayatData.length === 0) {
        speak("Belum ada data untuk diunduh");
        return;
      }

      let csvContent = "Percobaan Ke-,Jenis Benda,Waktu (s),Kecepatan (m/s),I Eksperimen (kgm2),I Teoretis (kgm2),Error (%)\n";

      riwayatData.forEach((item, index) => {
        csvContent += `${index + 1},${item.benda},${item.waktu},${item.kecepatan},${item.i_eks},${item.i_teo},${item.error}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
    
      link.setAttribute("href", url);
      link.setAttribute("download", "Data_Praktikum_Kelompok10.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    
      speak("Data berhasil diunduh");
    }
    // Fungsi untuk mengirim massa dan jari-jari manual ke Firebase
async function kirimParameterManual() {
  let massaGram = parseFloat(document.getElementById('inputMassa').value);
  let jariCm   = parseFloat(document.getElementById('inputJari').value);

  if (isNaN(massaGram) || isNaN(jariCm)) {
    speak("Masukkan angka yang valid untuk massa dan jari-jari");
    return;
  }

  // Konversi satuan
  let massaKg  = massaGram / 1000;
  let jariMeter = jariCm / 100;

  // Kirim ke Firebase
  await db.ref('control/massa').set(massaKg);
  await db.ref('control/jarijari').set(jariMeter);

  speak(`Parameter dikirim: massa ${massaGram} gram, jari-jari ${jariCm} cm`);
  console.log(`Manual param: m=${massaKg} kg, r=${jariMeter} m`);
}

    function tampilkanKesimpulan(data) {
      const iEks = parseFloat(data.i_eks || 0);
      const iTeo = parseFloat(data.i_teo || 0);
      const error = parseFloat(data.error || 0);
      const jenis = parseInt(data.jenisBenda || 0);

      let html = `<strong>Hasil:</strong><br><br>`;

      if (iEks > iTeo) {
        html += `• Nilai I Eksperimen <strong>lebih besar</strong> daripada I Teoretis.<br>`;
        html += `  Kemungkinan penyebab: gesekan udara dan gesekan ramp yang tidak dihitung, sehingga energi hilang dan I eksperimen terbaca lebih besar.<br><br>`;
      } else if (iEks < iTeo) {
        html += `• Nilai I Eksperimen <strong>lebih kecil</strong> daripada I Teoretis.<br>`;
        html += `  Kemungkinan penyebab: slip kecil pada saat gelinding atau pengukuran waktu yang terlalu cepat.<br><br>`;
      } else {
        html += `• Nilai I Eksperimen hampir sama dengan I Teoretis.<br><br>`;
      }

      if (error > 100) {
        html += `• Persentase error sangat tinggi (>100%).<br>`;
        html += `  Penyebab utama: kesalahan pengukuran waktu yang sangat besar, sensor tidak tepat mendeteksi, atau benda slip saat gelinding.<br><br>`;
      } else if (error > 30) {
        html += `• Persentase error cukup besar (${error.toFixed(2)}%).<br>`;
        html += `  Penyebab: gesekan ramp, udara, atau ketidaktepatan posisi photogate.<br><br>`;
      } else {
        html += `• Persentase error kecil (${error.toFixed(2)}%). Hasil eksperimen cukup akurat.<br><br>`;
      }

      document.getElementById('kesimpulan').innerHTML = html;
    }
    
    function updateData(snapshot) {
      const data = snapshot.val();
      if (!data) return;

      document.getElementById('waktu').textContent = (data.t || 0).toFixed(5) + " s";
      document.getElementById('kecepatan').textContent = (data.v || 0).toFixed(5) + " m/s";
      document.getElementById('i_eks').textContent = (data.i_eks || 0).toFixed(7) + " kg·m²";
      document.getElementById('i_teo').textContent = (data.i_teo || 0).toFixed(7) + " kg·m²";
      document.getElementById('error').textContent = (data.error || 0).toFixed(2) + " %";

      let errorElement = document.getElementById('error');
      let angkaError = parseFloat(errorElement.innerText);
      if (angkaError > 100) {
        errorElement.style.setProperty('color', '#ff4d4d', 'important');
      } else if (angkaError > 30) {
        errorElement.style.setProperty('color', '#38bdf8', 'important');
      } else {
        errorElement.style.setProperty('color', '#4ade80', 'important'); // Hijau
      }

      let dropdown = document.getElementById("jenisBenda");
      let namaBenda = dropdown.options[dropdown.selectedIndex].text;
      riwayatData.push({
        benda: namaBenda,
        waktu: data.t,
        kecepatan: data.v,
        i_eks: data.i_eks,
        i_teo: data.i_teo,
        error: data.error
      });
      
      tampilkanKesimpulan(data);
      
      const label = new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});

      if (chartWaktu) {
        chartWaktu.data.labels.push(label);
        chartWaktu.data.datasets[0].data.push(data.t || 0);
        if (chartWaktu.data.labels.length > 10) {
          chartWaktu.data.labels.shift();
          chartWaktu.data.datasets[0].data.shift();
        }
        chartWaktu.update();
      }
      if (chartKecepatan) {
        chartKecepatan.data.labels.push(label);
        chartKecepatan.data.datasets[0].data.push(data.v || 0);
        if (chartKecepatan.data.labels.length > 10) {
          chartKecepatan.data.labels.shift();
          chartKecepatan.data.datasets[0].data.shift();
        }
        chartKecepatan.update();
      }
      if (chartIEks) {
        chartIEks.data.labels.push(label);
        chartIEks.data.datasets[0].data.push(data.i_eks || 0);
        if (chartIEks.data.labels.length > 10) {
          chartIEks.data.labels.shift();
          chartIEks.data.datasets[0].data.shift();
        }
        chartIEks.update();
      }
      if (chartITeo) {
        chartITeo.data.labels.push(label);
        chartITeo.data.datasets[0].data.push(data.i_teo || 0);
        if (chartITeo.data.labels.length > 10) {
          chartITeo.data.labels.shift();
          chartITeo.data.datasets[0].data.shift();
        }
        chartITeo.update();
      }
    }

    function initCharts() {
      chartWaktu = new Chart(document.getElementById('chartWaktu'), { type: 'line', data: { labels: [], datasets: [{ label: 'Waktu (s)', borderColor: '#3b82f6', data: [] }] }, options: { responsive: true } });
      chartKecepatan = new Chart(document.getElementById('chartKecepatan'), { type: 'line', data: { labels: [], datasets: [{ label: 'Kecepatan (m/s)', borderColor: '#3b82f6', data: [] }] }, options: { responsive: true } });
      chartIEks = new Chart(document.getElementById('chartIEks'), { type: 'line', data: { labels: [], datasets: [{ label: 'I Eksperimen', borderColor: '#3b82f6', data: [] }] }, options: { responsive: true } });
      chartITeo = new Chart(document.getElementById('chartITeo'), { type: 'line', data: { labels: [], datasets: [{ label: 'I Teoretis', borderColor: '#3b82f6', data: [] }] }, options: { responsive: true } });
    }

    window.onload = () => {
      initCharts();
      db.ref('data').on('value', updateData);
      db.ref('control/massa').on('value', (snapshot) => {
        let val = snapshot.val();
        if (val && !isNaN(val)) {
          document.getElementById('paramM').innerText = val.toFixed(6);
          document.getElementById('infoMassa').innerText = val.toFixed(6) + " kg";
        } else {
        let jenis = document.getElementById('jenisBenda').value;
        if (jenis == "0") {
          document.getElementById('paramM').innerText = "0.000000";
          document.getElementById('infoMassa').innerText = "0.000000 kg";
        } else {
          document.getElementById('paramM').innerText = "0.000000";
          document.getElementById('infoMassa').innerText = "0.000000 kg";
        }
        }
        });

      db.ref('control/jarijari').on('value', (snapshot) => {
        let val = snapshot.val();
        if (val && !isNaN(val)) {
          document.getElementById('paramR').innerText = val.toFixed(6);
          document.getElementById('infoJari').innerText = val.toFixed(6) + " m";
        } else {
        let jenis = document.getElementById('jenisBenda').value;
        if (jenis == "0") {
          document.getElementById('paramR').innerText = "0.000000";
          document.getElementById('infoJari').innerText = "0.000000 m";
        } else {
          document.getElementById('paramR').innerText = "0.000000";
          document.getElementById('infoJari').innerText = "0.000000 m";
        }
      }
     });
    };
  </script>
