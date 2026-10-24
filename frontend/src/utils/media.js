const ROOM_PHOTOS = [
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
];

const ADDON_PHOTOS = [
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80',
];

const LOCATION_PHOTOS = [
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
];

export const HERO_BANNER_URL =
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=85';

export function getServiceImage(service) {
  if (!service) return ROOM_PHOTOS[0];
  const name = (service.name || service.service_name || '').toLowerCase();
  const sId = Number(service.s_id || service['S-ID'] || 1);
  const category = service.category || service.service_category || 'Room';

  if (name.includes('pool') || name.includes('villa')) {
    return 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80';
  }
  if (name.includes('chalet') || name.includes('mountain') || name.includes('cedar')) {
    return 'https://images.unsplash.com/photo-1518732714860-b62714ce0c59?auto=format&fit=crop&w=1200&q=80';
  }
  if (name.includes('spa') || name.includes('wellness')) {
    return 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80';
  }
  if (name.includes('boat') || name.includes('dinner')) {
    return 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80';
  }
  if (name.includes('airport') || name.includes('chauffeur') || name.includes('excursion')) {
    return 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80';
  }
  if (category === 'Add-On') {
    return ADDON_PHOTOS[(sId - 1) % ADDON_PHOTOS.length];
  }
  return ROOM_PHOTOS[(sId - 1) % ROOM_PHOTOS.length];
}

export function getLocationImage(location) {
  if (!location) return LOCATION_PHOTOS[0];
  const city = (location.city || '').toLowerCase();
  const lId = Number(location.l_id || location['L-ID'] || 1);

  if (city.includes('udaipur')) {
    return 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80';
  }
  if (city.includes('goa') || city.includes('margao')) {
    return 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80';
  }
  if (city.includes('mumbai')) {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
  }
  if (city.includes('manali')) {
    return 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80';
  }
  return LOCATION_PHOTOS[(lId - 1) % LOCATION_PHOTOS.length];
}

export function formatINR(amount) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
}

export function getDefaultDates(offsetDays = 7, stayNights = 3) {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + offsetDays);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + stayNights);

  return {
    checkIn: checkIn.toISOString().split('T')[0],
    checkOut: checkOut.toISOString().split('T')[0],
  };
}

export function statusBadgeTone(status) {
  switch (status) {
    case 'Confirmed':
      return 'emerald';
    case 'Completed':
      return 'sky';
    case 'Pending':
      return 'amber';
    case 'Cancelled':
      return 'rose';
    default:
      return 'slate';
  }
}
