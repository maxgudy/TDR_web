# Dashboard Directius - Canvis i Implementacio

## Objectiu
Afegir un dashboard per a directius amb dades de Supabase (taula `public.aaa`) i grafics informatius, mantenint el look & feel del projecte i evitant elements decoratius com emojis o animacions de posicio al hover.

## Dades i esquema utilitzat
Taula font: `public.aaa`

Columnes utilitzades:
- `id`
- `curs_academic`
- `nivell`
- `grup`
- `alumne_id`
- `alumne_nom`
- `trimestre`
- `nota_catala`
- `nota_castella`
- `nota_matematiques`
- `nota_angles`
- `nota_socials`
- `nota_naturals`
- `created_at`

## Canvis al layout (HTML)
Fitxer: `TDR_webF/index.html`

- Afegida seccio del dashboard dins la pagina "Agent Directius".
- Afegits filtres (curs, nivell, grup).
- Afegides targetes de KPI.
- Afegits canvases per als grafics (Chart.js):
  - `subjectAveragesCanvas`
  - `trimesterTrendCanvas`
  - `levelComparisonCanvas`
- Substituida la card "Alertes rapides" per un resum compact en format "chips":
  - `dashboardSummary`
- Importat Chart.js via CDN.
- Eliminats emojis de les targetes.

## Estils (CSS)
Fitxer: `TDR_webF/css/styles.css`

Canvis principals:
- Eliminades animacions de posicio al hover (cap `transform` en cards).
- Icones de KPI sense emojis: punt de color dins un bloc neutre.
- Fons amb gradients suaus per donar mes profunditat.
- Cards amb bordes mes nets i separacio visual.
- Filtres amb estil mes pulit.
- Resum inferior amb chips per evitar desquadres de la graella.

## Logica i dades (JS)
Fitxer: `TDR_webF/js/dashboard.js`

Canvis principals:
- Lectura de dades via Supabase de la taula `aaa`.
- Filtres per `curs_academic`, `nivell`, `grup`.
- Calcul de:
  - total d'alumnes
  - mitjana global
  - percentatge d'aprovats
  - tendencia del darrer trimestre
  - mitjanes per assignatura
  - mitjanes per nivell
- Rendering de grafics amb Chart.js:
  - Bar chart per assignatures
  - Line chart per tendencia trimestral
  - Bar chart horitzontal per nivell
- Resum compactat (chips) amb frases clau.
- Evitat conflicte de noms amb `formatDate` encapsulant el modul i exposant nomes `initDashboard`.

## Inicialitzacio
Fitxer: `TDR_webF/js/main.js`

- Afegida crida a `initDashboard()` quan es navega a "Agent Directius".

## Notes de funcionament
- Necessari tenir dades a `public.aaa`.
- Si RLS esta activat, cal politica de lectura per a la clau anonima.
- Si no hi ha dades, els grafics mostren un missatge de buit.

## Fragments de codi clau

### HTML - Estructura del dashboard
Fitxer: `TDR_webF/index.html`
```html
<section class="directius-dashboard" id="directius-dashboard">
  <div class="dashboard-content">
    <div class="dashboard-header">
      <div>
        <p class="panel-label">Directius</p>
        <h3>Panell d'indicadors acadèmics</h3>
        <p class="dashboard-subtitle">Tendències, mitjanes i comparatives per decidir més ràpid.</p>
      </div>
      <div class="dashboard-filters">
        <div class="dashboard-filter">
          <label for="directiusFilterCurs">Curs</label>
          <select id="directiusFilterCurs">
            <option value="all">Tots</option>
          </select>
        </div>
        <div class="dashboard-filter">
          <label for="directiusFilterNivell">Nivell</label>
          <select id="directiusFilterNivell">
            <option value="all">Tots</option>
          </select>
        </div>
        <div class="dashboard-filter">
          <label for="directiusFilterGrup">Grup</label>
          <select id="directiusFilterGrup">
            <option value="all">Tots</option>
          </select>
        </div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-students"></div>
        <div class="stat-info">
          <p class="stat-value" id="statTotalAlumnes">0</p>
          <p class="stat-label">Alumnes registrats</p>
        </div>
      </div>
    </div>
    <div class="dashboard-sections">
      <div class="dashboard-card">
        <h4 class="card-title">Mitjana per assignatura</h4>
        <div class="card-content">
          <canvas id="subjectAveragesCanvas" height="220"></canvas>
        </div>
      </div>
      <div class="dashboard-card">
        <h4 class="card-title">Tendència per trimestre</h4>
        <div class="card-content">
          <canvas id="trimesterTrendCanvas" height="220"></canvas>
        </div>
      </div>
      <div class="dashboard-card">
        <h4 class="card-title">Comparativa per nivell</h4>
        <div class="card-content">
          <canvas id="levelComparisonCanvas" height="220"></canvas>
        </div>
      </div>
    </div>
    <div class="dashboard-summary" id="dashboardSummary"></div>
  </div>
</section>
```

### HTML - Llibreria de grafics
Fitxer: `TDR_webF/index.html`
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
```

### CSS - Eliminacio de moviments en hover
Fitxer: `TDR_webF/css/styles.css`
```css
.stat-card {
  transition: box-shadow 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.dashboard-card {
  transition: box-shadow 0.2s ease;
}

.dashboard-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
```

### CSS - Resum inferior en format chips
Fitxer: `TDR_webF/css/styles.css`
```css
.dashboard-summary {
  margin-top: 20px;
  padding: 16px 20px;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: 13px;
}

.summary-chip {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 999px;
  padding: 6px 12px;
  font-weight: 500;
}
```

### JS - Carrega de dades Supabase
Fitxer: `TDR_webF/js/dashboard.js`
```js
const { data, error } = await window.supabaseClient
  .from('aaa')
  .select('id,curs_academic,nivell,grup,alumne_id,alumne_nom,trimestre,nota_catala,nota_castella,nota_matematiques,nota_angles,nota_socials,nota_naturals,created_at');
```

### JS - Render dels grafics (Chart.js)
Fitxer: `TDR_webF/js/dashboard.js`
```js
renderChart('trend', canvas, {
  type: 'line',
  data: {
    labels,
    datasets: [{
      label: 'Mitjana',
      data: values,
      borderColor: colors.accentStrong,
      backgroundColor: colors.accentSoft,
      tension: 0.35,
      fill: true
    }]
  },
  options: buildChartOptions({ showLegend: false })
});
```
