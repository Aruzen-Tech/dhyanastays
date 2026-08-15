import { containsContactNumber } from './contact-filter';

describe('containsContactNumber', () => {
  describe('blocks contact numbers', () => {
    const blocked = [
      '9876543210',
      'call me 98765 43210',
      '+91 98765 43210',
      '+919876543210',
      '987-654-3210',
      '9 8 7 6 5 4 3 2 1 0',
      'my number is 9876543210 ok',
      'reach me at 98765.43210',
      'whatsapp 9876543210',
      'ph: (98765) 43210',
      'nine eight seven six five four three two one zero',
      'call me on double 9 87654 3210', // 99 + 8 digits = 10+
      'tel 4012 3456', // landline via keyword
      'contact 044 4012 3456',
    ];
    it.each(blocked)('blocks %j', (text) => {
      expect(containsContactNumber(text)).toBe(true);
    });
  });

  describe('allows normal booking chat', () => {
    const allowed = [
      '',
      'Hi, is the villa available next weekend?',
      'The rate is 45000 for 2 nights',
      'Check-in on 2026-08-02, check-out 2026-08-05',
      'Room 305, 4 guests, 2 bedrooms',
      'I paid 45000 and 12000 separately',
      'See you at 5pm near the gate',
      'Pincode is 605001',
      'flat number 605001',
      'Great, thank you so much!',
      'We can host up to 8 people',
      'The pool is open 6 to 9',
    ];
    it.each(allowed)('allows %j', (text) => {
      expect(containsContactNumber(text)).toBe(false);
    });
  });
});
