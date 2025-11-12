// Service d'authentification frontal simple (comptes d'exemple), uniquement pour démonstration
// En production, remplacez par une authentification back-end et validation de jeton

const STORAGE_KEY = 'pkgtracker_user';

const sampleUsers = {
  employee: [
    { username: 'employee', password: '123456', displayName: 'Employé Zhang' },
    { username: 'admin', password: '123456', displayName: 'Administrateur' }
  ],
  customer: [
    { username: 'customer', password: '123456', displayName: 'Client Li' }
  ]
};

export function login({ username, password, role, packageId }) {
  if (!role || !username || !password) {
    return { success: false, message: 'Veuillez fournir les informations de connexion complètes' };
  }

  const list = sampleUsers[role] || [];
  const user = list.find(u => u.username === username && u.password === password);
  if (!user) {
    return { success: false, message: "Nom d'utilisateur ou mot de passe incorrect (ex : employee/123456 ou customer/123456)" };
  }

  if (role === 'customer') {
    if (!packageId || String(packageId).trim() === '') {
      return { success: false, message: "La connexion client nécessite un ID de colis" };
    }
  }

  const session = {
    role,
    username,
    displayName: user.displayName,
    packageId: role === 'customer' ? String(packageId).trim() : null,
    packageIds: role === 'customer' ? [String(packageId).trim()] : [],
    loginAt: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return { success: true, user: session };
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const u = JSON.parse(raw);
  // Compatibilité ascendante : si l'ancienne session n'a pas le champ packageIds, le compléter
    if (u && u.role === 'customer' && !Array.isArray(u.packageIds)) {
      u.packageIds = u.packageId ? [u.packageId] : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    }
    return u;
  } catch (_) {
    return null;
  }
}

export function appendCustomerPackageId(pid) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const u = JSON.parse(raw);
    if (u.role !== 'customer') return;
    if (!u.packageIds) u.packageIds = [];
    if (!u.packageIds.includes(pid)) u.packageIds.unshift(pid);
  // Conserver le colis principal actuel comme le plus récent
    u.packageId = pid;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  } catch {}
}

export function requireRole(role) {
  const user = getUser();
  if (!user) return false;
  return user.role === role;
}
