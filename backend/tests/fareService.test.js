const { calculateFare } = require('../services/fareService');

describe('Fare Calculation Service', () => {
  test('returns ₹10 for distances up to 5 km', async () => {
    const res1 = await calculateFare(1);
    const res5 = await calculateFare(5);
    expect(res1.amount).toBe(10);
    expect(res1.formatted).toBe('₹10');
    expect(res5.amount).toBe(10);
    expect(res5.formatted).toBe('₹10');
  });

  test('returns ₹25 for distances between 5 km and 10 km', async () => {
    const res5_1 = await calculateFare(5.1);
    const res10 = await calculateFare(10);
    expect(res5_1.amount).toBe(25);
    expect(res5_1.formatted).toBe('₹25');
    expect(res10.amount).toBe(25);
    expect(res10.formatted).toBe('₹25');
  });

  test('returns ₹40 for distances between 10 km and 15 km', async () => {
    const res10_1 = await calculateFare(10.1);
    const res14 = await calculateFare(14);
    const res15 = await calculateFare(15);
    expect(res10_1.amount).toBe(40);
    expect(res10_1.formatted).toBe('₹40');
    expect(res14.amount).toBe(40);
    expect(res15.amount).toBe(40);
  });

  test('returns ₹45 for distances over 15 km', async () => {
    const res15_1 = await calculateFare(15.1);
    const res25 = await calculateFare(25);
    expect(res15_1.amount).toBe(45);
    expect(res15_1.formatted).toBe('₹45');
    expect(res25.amount).toBe(45);
    expect(res25.formatted).toBe('₹45');
  });

  test('applies same rate for all buses without AC surcharge', async () => {
    const ordinary = await calculateFare(8, 'ordinary');
    const ac = await calculateFare(8, 'ac');
    expect(ordinary.amount).toBe(25);
    expect(ac.amount).toBe(25);
  });

  test('handles invalid distances gracefully', async () => {
    const zero = await calculateFare(0);
    const negative = await calculateFare(-5);
    const nonNumber = await calculateFare('invalid');
    expect(zero.amount).toBeNull();
    expect(negative.amount).toBeNull();
    expect(nonNumber.amount).toBeNull();
  });
});
