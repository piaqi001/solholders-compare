// script.js
function processFiles() {
  const file1 = document.getElementById('file1').files[0];
  const file2 = document.getElementById('file2').files[0];
  if (!file1 || !file2) {
    alert("请上传两个Excel文件");
    return;
  }

  Promise.all([readExcel(file1), readExcel(file2)]).then(([oldData, newData]) => {
    compareHoldings(oldData, newData);
  });
}

function readExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      resolve(json);
    };
    reader.readAsArrayBuffer(file);
  });
}

function compareHoldings(oldData, newData) {
  const oldMap = new Map();
  const newMap = new Map();
  oldData.forEach(row => oldMap.set(row['地址'], row));
  newData.forEach(row => newMap.set(row['地址'], row));

  const changed = [];
  const added = [];
  const removed = [];

  for (const [address, newRow] of newMap.entries()) {
    if (oldMap.has(address)) {
      const oldRow = oldMap.get(address);
      
    const oldValue = parseFloat((oldRow['持仓占比'] || "").toString().replace('%', '')) || 0;
    const newValue = parseFloat((newRow['持仓占比'] || "").toString().replace('%', '')) || 0;
    const diff = (newValue - oldValue); row['old'] = oldValue; row['new'] = newValue;
    
      if (diff !== 0) {
        changed.push({ address, old: oldRow['持仓'], new: newRow['持仓'], diff });
      }
    } else {
      added.push(newRow);
    }
  }

  for (const [address, oldRow] of oldMap.entries()) {
    if (!newMap.has(address)) {
      removed.push(oldRow);
    }
  }

  renderResults(changed, added, removed);
}

function renderResults(changed, added, removed) {
  const container = document.getElementById('results');
  container.innerHTML = '';

  const buildTable = (title, data, columns) => {
    let html = `<h2>${title}</h2><table><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>`;
    data.forEach(row => {
      
    html += '<tr>' + columns.map(c => {
      
      let value = row[c];
      if ((c === 'diff' || c === 'old' || c === 'new') && typeof value === 'number') {
        value = value.toFixed(2) + '%';
      }

        value = value.toFixed(2) + '%';
      }
      return `<td>${value ?? ''}</td>`;
    }).join('') + '</tr>';
    
    });
    html += '</table>';
    return html;
  };

  container.innerHTML += buildTable('持仓变化地址', changed, ['address', 'old', 'new', 'diff']);
  container.innerHTML += buildTable('新增地址', added, ['地址', '持仓占比']);
  container.innerHTML += buildTable('消失地址', removed, ['地址', '持仓']);

  const addedTotal = added.reduce((sum, r) => sum + (parseFloat(r['持仓占比']) || 0), 0);
  const removedTotal = removed.reduce((sum, r) => sum + (parseFloat(r['持仓占比']) || 0), 0);

  container.innerHTML += `<p>新增地址持仓总量：${addedTotal}</p>`;
  container.innerHTML += `<p>消失地址持仓总量：${removedTotal}</p>`;

  renderCharts(added.length, removed.length, addedTotal, removedTotal);
}

function renderCharts(addCount, removeCount, addTotal, removeTotal) {
  const chartDiv = document.getElementById('charts');
  chartDiv.innerHTML = `
    <canvas id="countChart" width="400" height="200"></canvas>
    <canvas id="valueChart" width="400" height="200"></canvas>
  `;

  new Chart(document.getElementById('countChart'), {
    type: 'bar',
    data: {
      labels: ['新增地址数', '消失地址数'],
      datasets: [{
        label: '地址数量',
        data: [addCount, removeCount]
      }]
    }
  });

  new Chart(document.getElementById('valueChart'), {
    type: 'bar',
    data: {
      labels: ['新增持仓总量', '消失持仓总量'],
      datasets: [{
        label: '持仓量',
        data: [addTotal, removeTotal]
      }]
    }
  });
}
