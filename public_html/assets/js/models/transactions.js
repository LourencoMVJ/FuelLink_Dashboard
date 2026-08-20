/**
 * Transactions & Operational Data Model (Frontend Model Layer)
 * Handles queries to Supabase for transactions, routes, settings, trucks, and drivers.
 */
import { sb } from '../config/supabase-client.js';

export async function fetchCompanyData(companyRole) {
  let routes = [];
  let fset = null;
  let bset = null;
  let transactions = [];
  let trucks = [];
  let drivers = [];

  if (sb) {
    try {
      const [rRes, fRes, bRes, txRes, trkRes, drvRes] = await Promise.all([
        sb.from('routes').select('*').order('id'),
        sb.from('fuellink_settings').select('*').eq('id', 1).maybeSingle(),
        sb.from('bakers_settings').select('*').eq('id', 1).maybeSingle(),
        sb.from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
        sb.from('trucks').select('*').order('reg_number'),
        sb.from('drivers').select('*').order('name')
      ]);

      routes = rRes.data || [];
      fset = fRes.data;
      bset = bRes.data;
      transactions = txRes.data || [];
      trucks = trkRes.data || [];
      drivers = drvRes.data || [];
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local dataset:', e);
    }
  }

  // Fallback demo data if empty or offline
  if (trucks.length === 0) {
    trucks = [
      { reg_number: 'BT-101-GP', description: 'Volvo FH16 540' },
      { reg_number: 'BT-102-GP', description: 'Scania R500' },
      { reg_number: 'BT-103-GP', description: 'Mercedes Actros 3352' },
      { reg_number: 'BT-104-GP', description: 'MAN TGX 28.540' },
      { reg_number: 'FL-204-GP', description: 'Mercedes Actros 2645' },
      { reg_number: 'FL-305-GP', description: 'MAN TGX 26.480' },
      { reg_number: 'FL-406-GP', description: 'Volvo FM440' },
      { reg_number: 'FL-507-GP', description: 'Scania G460' }
    ];
  }

  if (drivers.length === 0) {
    drivers = [
      { name: 'Liam Gallagher', license_number: 'ZA-982143', phone: '+27 82 123 4567' },
      { name: 'Carlos Mendes', license_number: 'ZA-445892', phone: '+27 83 987 6543' },
      { name: 'Ahmed Khan', license_number: 'ZA-773120', phone: '+27 84 555 0192' },
      { name: 'David Ndlovu', license_number: 'ZA-556102', phone: '+27 82 444 8891' },
      { name: 'Sipho Zulu', license_number: 'ZA-339811', phone: '+27 83 222 1983' },
      { name: 'Johan Van Der Merwe', license_number: 'ZA-118944', phone: '+27 81 777 6620' },
      { name: 'Mateus Silveira', license_number: 'ZA-662309', phone: '+27 84 333 4501' }
    ];
  }

  if (routes.length === 0) {
    routes = [
      { id: 1, from_point: 'Durban Terminal', to_point: 'Johannesburg Depot', cargo: 'Diesel 50ppm', payload: 40000, base_rate: 1.45 },
      { id: 2, from_point: 'Sasolburg Ref', to_point: 'Pretoria Central', cargo: 'Diesel 50ppm', payload: 38000, base_rate: 0.95 },
      { id: 3, from_point: 'Richards Bay', to_point: 'Nelspruit Hub', cargo: 'Diesel 50ppm', payload: 42000, base_rate: 1.80 },
      { id: 4, from_point: 'Cape Town Harbour', to_point: 'Bloemfontein Depot', cargo: 'Diesel 50ppm', payload: 40000, base_rate: 2.10 },
      { id: 5, from_point: 'East London', to_point: 'Mthatha Terminal', cargo: 'Diesel 50ppm', payload: 36000, base_rate: 1.15 }
    ];
  }

  if (transactions.length === 0) {
    const today = new Date();
    const dStr = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offsetDays);
      return d.toISOString().split('T')[0];
    };

    transactions = [
      // ================= FUEL LINK DIESEL SALES (17 total transactions) =================
      { id: 'tx-fl-1', date: dStr(1), type: 'diesel', amount: 1104400.00, balance_delta: -1104400.00, litres: 40000, route_id: 1, entered_by: 'fuellink', truck: 'FL-204-GP', driver: 'Liam Gallagher', trailer: 'TR-901-GP', note: 'FT-88419', delivery_note_name: 'guia_88419.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-2', date: dStr(2), type: 'diesel', amount: 1076790.00, balance_delta: -1076790.00, litres: 39000, route_id: 4, entered_by: 'fuellink', truck: 'FL-406-GP', driver: 'David Ndlovu', trailer: 'TR-904-GP', note: 'FT-88420', delivery_note_name: 'doc_88420.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-3', date: dStr(3), type: 'diesel', amount: 1049180.00, balance_delta: -1049180.00, litres: 38000, route_id: 2, entered_by: 'fuellink', truck: 'FL-305-GP', driver: 'Carlos Mendes', trailer: 'TR-902-GP', note: 'FT-88421', delivery_note_name: null, delivery_note_path: null, created_at: new Date().toISOString() },
      { id: 'tx-fl-4', date: dStr(4), type: 'diesel', amount: 1132010.00, balance_delta: -1132010.00, litres: 41000, route_id: 1, entered_by: 'fuellink', truck: 'FL-507-GP', driver: 'Sipho Zulu', trailer: 'TR-905-GP', note: 'FT-88422', delivery_note_name: 'comprovativo_88422.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-5', date: dStr(6), type: 'diesel', amount: 1159620.00, balance_delta: -1159620.00, litres: 42000, route_id: 3, entered_by: 'fuellink', truck: 'FL-204-GP', driver: 'Liam Gallagher', trailer: 'TR-901-GP', note: 'FT-88423', delivery_note_name: 'doc_88423.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-6', date: dStr(7), type: 'diesel', amount: 993960.00, balance_delta: -993960.00, litres: 36000, route_id: 5, entered_by: 'fuellink', truck: 'FL-406-GP', driver: 'Johan Van Der Merwe', trailer: 'TR-904-GP', note: 'FT-88424', delivery_note_name: 'pod_88424.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-7', date: dStr(9), type: 'diesel', amount: 1214840.00, balance_delta: -1214840.00, litres: 44000, route_id: 3, entered_by: 'fuellink', truck: 'FL-305-GP', driver: 'Mateus Silveira', trailer: 'TR-902-GP', note: 'FT-88425', delivery_note_name: null, delivery_note_path: null, created_at: new Date().toISOString() },
      { id: 'tx-fl-8', date: dStr(10), type: 'diesel', amount: 966350.00, balance_delta: -966350.00, litres: 35000, route_id: 1, entered_by: 'fuellink', truck: 'FL-305-GP', driver: 'Ahmed Khan', trailer: 'TR-903-GP', note: 'FT-88426', delivery_note_name: 'scan_88426.png', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-9', date: dStr(12), type: 'diesel', amount: 1104400.00, balance_delta: -1104400.00, litres: 40000, route_id: 2, entered_by: 'fuellink', truck: 'FL-204-GP', driver: 'Liam Gallagher', trailer: 'TR-901-GP', note: 'FT-88427', delivery_note_name: 'pod_88427.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-10', date: dStr(13), type: 'diesel', amount: 1049180.00, balance_delta: -1049180.00, litres: 38000, route_id: 4, entered_by: 'fuellink', truck: 'FL-507-GP', driver: 'David Ndlovu', trailer: 'TR-905-GP', note: 'FT-88428', delivery_note_name: 'guia_88428.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-11', date: dStr(15), type: 'diesel', amount: 1104400.00, balance_delta: -1104400.00, litres: 40000, route_id: 2, entered_by: 'fuellink', truck: 'FL-204-GP', driver: 'Carlos Mendes', trailer: 'TR-901-GP', note: 'FT-88429', delivery_note_name: null, delivery_note_path: null, created_at: new Date().toISOString() },
      { id: 'tx-fl-12', date: dStr(16), type: 'diesel', amount: 1187230.00, balance_delta: -1187230.00, litres: 43000, route_id: 3, entered_by: 'fuellink', truck: 'FL-406-GP', driver: 'Sipho Zulu', trailer: 'TR-904-GP', note: 'FT-88430', delivery_note_name: 'pod_88430.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-13', date: dStr(18), type: 'diesel', amount: 1021570.00, balance_delta: -1021570.00, litres: 37000, route_id: 1, entered_by: 'fuellink', truck: 'FL-305-GP', driver: 'Johan Van Der Merwe', trailer: 'TR-902-GP', note: 'FT-88431', delivery_note_name: 'doc_88431.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-14', date: dStr(20), type: 'diesel', amount: 1104400.00, balance_delta: -1104400.00, litres: 40000, route_id: 5, entered_by: 'fuellink', truck: 'FL-507-GP', driver: 'Ahmed Khan', trailer: 'TR-905-GP', note: 'FT-88432', delivery_note_name: null, delivery_note_path: null, created_at: new Date().toISOString() },
      { id: 'tx-fl-15', date: dStr(22), type: 'diesel', amount: 1076790.00, balance_delta: -1076790.00, litres: 39000, route_id: 2, entered_by: 'fuellink', truck: 'FL-204-GP', driver: 'Mateus Silveira', trailer: 'TR-901-GP', note: 'FT-88433', delivery_note_name: 'pod_88433.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-16', date: dStr(24), type: 'diesel', amount: 1159620.00, balance_delta: -1159620.00, litres: 42000, route_id: 4, entered_by: 'fuellink', truck: 'FL-406-GP', driver: 'Liam Gallagher', trailer: 'TR-904-GP', note: 'FT-88434', delivery_note_name: 'guia_88434.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-fl-17', date: dStr(26), type: 'diesel', amount: 966350.00, balance_delta: -966350.00, litres: 35000, route_id: 1, entered_by: 'fuellink', truck: 'FL-305-GP', driver: 'Carlos Mendes', trailer: 'TR-903-GP', note: 'FT-88435', delivery_note_name: 'scan_88435.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },

      // ================= BANKERS TANKERS LOGISTICS DELIVERIES (16 total transactions) =================
      { id: 'tx-bt-1', date: dStr(1), type: 'logistics', amount: 58000.00, balance_delta: 58000.00, litres: 40000, route_id: 1, entered_by: 'bakers', truck: 'BT-101-GP', driver: 'Liam Gallagher', trailer: 'TR-101-GP', note: 'BK-5510', delivery_note_name: 'pod_5510.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-2', date: dStr(2), type: 'logistics', amount: 81900.00, balance_delta: 81900.00, litres: 39000, route_id: 4, entered_by: 'bakers', truck: 'BT-103-GP', driver: 'David Ndlovu', trailer: 'TR-103-GP', note: 'BK-5511', delivery_note_name: 'pod_5511.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-3', date: dStr(4), type: 'logistics', amount: 36100.00, balance_delta: 36100.00, litres: 38000, route_id: 2, entered_by: 'bakers', truck: 'BT-102-GP', driver: 'Carlos Mendes', trailer: 'TR-102-GP', note: 'BK-5512', delivery_note_name: 'pod_5512.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-4', date: dStr(5), type: 'logistics', amount: 59450.00, balance_delta: 59450.00, litres: 41000, route_id: 1, entered_by: 'bakers', truck: 'BT-104-GP', driver: 'Sipho Zulu', trailer: 'TR-104-GP', note: 'BK-5513', delivery_note_name: null, delivery_note_path: null, created_at: new Date().toISOString() },
      { id: 'tx-bt-5', date: dStr(7), type: 'logistics', amount: 75600.00, balance_delta: 75600.00, litres: 42000, route_id: 3, entered_by: 'bakers', truck: 'BT-101-GP', driver: 'Liam Gallagher', trailer: 'TR-101-GP', note: 'BK-5514', delivery_note_name: 'pod_5514.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-6', date: dStr(8), type: 'logistics', amount: 41400.00, balance_delta: 41400.00, litres: 36000, route_id: 5, entered_by: 'bakers', truck: 'BT-103-GP', driver: 'Johan Van Der Merwe', trailer: 'TR-103-GP', note: 'BK-5515', delivery_note_name: 'pod_5515.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-7', date: dStr(11), type: 'logistics', amount: 79200.00, balance_delta: 79200.00, litres: 44000, route_id: 3, entered_by: 'bakers', truck: 'BT-102-GP', driver: 'Mateus Silveira', trailer: 'TR-102-GP', note: 'BK-5516', delivery_note_name: 'guia_5516.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-8', date: dStr(12), type: 'logistics', amount: 50750.00, balance_delta: 50750.00, litres: 35000, route_id: 1, entered_by: 'bakers', truck: 'BT-102-GP', driver: 'Ahmed Khan', trailer: 'TR-102-GP', note: 'BK-5517', delivery_note_name: 'pod_5517.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-9', date: dStr(14), type: 'logistics', amount: 58000.00, balance_delta: 58000.00, litres: 40000, route_id: 1, entered_by: 'bakers', truck: 'BT-101-GP', driver: 'David Ndlovu', trailer: 'TR-101-GP', note: 'BK-5518', delivery_note_name: null, delivery_note_path: null, created_at: new Date().toISOString() },
      { id: 'tx-bt-10', date: dStr(16), type: 'logistics', amount: 36100.00, balance_delta: 36100.00, litres: 38000, route_id: 2, entered_by: 'bakers', truck: 'BT-104-GP', driver: 'Liam Gallagher', trailer: 'TR-104-GP', note: 'BK-5519', delivery_note_name: 'pod_5519.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-11', date: dStr(18), type: 'logistics', amount: 58000.00, balance_delta: 58000.00, litres: 40000, route_id: 1, entered_by: 'bakers', truck: 'BT-101-GP', driver: 'Carlos Mendes', trailer: 'TR-101-GP', note: 'BK-5520', delivery_note_name: 'pod_5520.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-12', date: dStr(19), type: 'logistics', amount: 77400.00, balance_delta: 77400.00, litres: 43000, route_id: 3, entered_by: 'bakers', truck: 'BT-103-GP', driver: 'Sipho Zulu', trailer: 'TR-103-GP', note: 'BK-5521', delivery_note_name: 'guia_5521.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-13', date: dStr(21), type: 'logistics', amount: 53650.00, balance_delta: 53650.00, litres: 37000, route_id: 1, entered_by: 'bakers', truck: 'BT-102-GP', driver: 'Johan Van Der Merwe', trailer: 'TR-102-GP', note: 'BK-5522', delivery_note_name: null, delivery_note_path: null, created_at: new Date().toISOString() },
      { id: 'tx-bt-14', date: dStr(23), type: 'logistics', amount: 46000.00, balance_delta: 46000.00, litres: 40000, route_id: 5, entered_by: 'bakers', truck: 'BT-104-GP', driver: 'Ahmed Khan', trailer: 'TR-104-GP', note: 'BK-5523', delivery_note_name: 'pod_5523.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-15', date: dStr(25), type: 'logistics', amount: 81900.00, balance_delta: 81900.00, litres: 39000, route_id: 4, entered_by: 'bakers', truck: 'BT-101-GP', driver: 'Mateus Silveira', trailer: 'TR-101-GP', note: 'BK-5524', delivery_note_name: 'pod_5524.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() },
      { id: 'tx-bt-16', date: dStr(27), type: 'logistics', amount: 75600.00, balance_delta: 75600.00, litres: 42000, route_id: 3, entered_by: 'bakers', truck: 'BT-103-GP', driver: 'Liam Gallagher', trailer: 'TR-103-GP', note: 'BK-5525', delivery_note_name: 'pod_5525.pdf', delivery_note_path: 'mock/path', created_at: new Date().toISOString() }
    ];
  }

  const dieselPrice = Number(fset?.diesel_price ?? 27.61);
  const activeMonth = bset?.month ?? 'july';

  const mappedRoutes = (routes || []).map(r => ({
    id: r.id,
    from: r.from_point,
    to: r.to_point,
    cargo: r.cargo,
    payload: Number(r.payload || 0),
    baseRate: Number(r.base_rate || 0),
    adj: {
      may: Number(r.adj_may || 0),
      june: Number(r.adj_june || 0),
      july: Number(r.adj_july || 0)
    }
  }));

  // Map and calculate effective rates and voids
  const mappedTransactions = (transactions || []).map(t => {
    return {
      id: t.id,
      date: t.date,
      type: t.type, // 'diesel', 'logistics', 'settlement'
      amount: Number(t.amount || 0),
      balanceDelta: Number(t.balance_delta || 0),
      litres: t.litres != null ? Number(t.litres) : 0,
      routeId: t.route_id,
      enteredBy: t.entered_by,
      note: t.note || '',
      detail: t.detail || '',
      voidsId: t.voids_id,
      voidsType: t.voids_type,
      truck: t.truck || '',
      driver: t.driver || '',
      trailer: t.trailer || '',
      deliveryNotePath: t.delivery_note_path || null,
      deliveryNoteName: t.delivery_note_name || null,
      createdAt: t.created_at
    };
  });

  // Calculate status (isVoided if another transaction has voidsId === this.id)
  const voidedIds = new Set(
    mappedTransactions.filter(t => t.voidsId).map(t => t.voidsId)
  );

  const transactionsWithStatus = mappedTransactions.map(t => ({
    ...t,
    isReversal: Boolean(t.voidsId),
    isVoided: voidedIds.has(t.id),
    status: (t.voidsId || voidedIds.has(t.id)) ? 'voided' : 'active'
  }));

  return {
    routes: mappedRoutes,
    dieselPrice,
    activeMonth,
    transactions: transactionsWithStatus,
    trucks: trucks || [],
    drivers: drivers || []
  };
}
