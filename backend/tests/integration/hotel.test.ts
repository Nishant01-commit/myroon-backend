import request from 'supertest';
import app from '../../src/app';
import User from '../../src/models/User';

const registerAndLogin = async (role: 'customer' | 'hotel_owner' = 'customer') => {
  const email = `user-${Date.now()}-${Math.random()}@test.com`;
  await request(app).post('/api/v1/auth/register').send({ name: 'Test User', email, password: 'password123', role });
  const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return { accessToken: loginRes.body.data.accessToken as string, userId: loginRes.body.data.user.id as string, email };
};

const promoteToAdmin = async (userId: string, email: string) => {
  await User.findByIdAndUpdate(userId, { role: 'admin' });
  const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return loginRes.body.data.accessToken as string;
};

describe('Hotel creation and approval (integration)', () => {
  it('lets a hotel_owner create a hotel, which starts pending and stays out of public search', async () => {
    const owner = await registerAndLogin('hotel_owner');

    const createRes = await request(app)
      .post('/api/v1/hotels')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('name', 'Shiva Comfort Inn')
      .field('description', 'A peaceful stay a short walk from the temple gate.')
      .field('address', JSON.stringify({ street: '1 Temple Rd', city: 'Deoghar', state: 'Jharkhand', pincode: '814112' }))
      .field('coordinates', JSON.stringify([86.7, 24.48]))
      .field('amenities', JSON.stringify(['wifi', 'ac']))
      .field('contactNumber', '9876543210')
      .field('contactEmail', 'hotel@test.com')
      .field('cancellationPolicy', 'Free cancellation up to 24 hours before check-in.')
      .attach('images', Buffer.from('fake-image-bytes'), 'room.jpg');

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('pending');

    const searchRes = await request(app).get('/api/v1/hotels');
    const found = searchRes.body.data.hotels.find((h: { name: string }) => h.name === 'Shiva Comfort Inn');
    expect(found).toBeUndefined();
  });

  it('rejects hotel creation from a customer account', async () => {
    const customer = await registerAndLogin('customer');
    const res = await request(app)
      .post('/api/v1/hotels')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .field('name', 'Should Not Work')
      .attach('images', Buffer.from('x'), 'x.jpg');

    expect(res.status).toBe(403);
  });

  it('makes a hotel publicly searchable only once it is approved AND has a room', async () => {
    const owner = await registerAndLogin('hotel_owner');

    const createRes = await request(app)
      .post('/api/v1/hotels')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('name', 'Baidyanath Palace')
      .field('description', 'Comfortable rooms close to the Jyotirlinga temple complex.')
      .field('address', JSON.stringify({ street: '2 Temple Rd', city: 'Deoghar', state: 'Jharkhand', pincode: '814112' }))
      .field('coordinates', JSON.stringify([86.7, 24.48]))
      .field('amenities', JSON.stringify([]))
      .field('contactNumber', '9876543211')
      .field('contactEmail', 'palace@test.com')
      .field('cancellationPolicy', 'Free cancellation up to 24 hours before check-in.')
      .attach('images', Buffer.from('fake-image-bytes'), 'room.jpg');

    const hotelId = createRes.body.data._id;

    // Approved but roomless shouldn't show up either — search only qualifies hotels that
    // actually have a bookable room (see the note in hotel.controller.ts's searchHotels).
    const admin = await registerAndLogin('customer');
    const adminToken = await promoteToAdmin(admin.userId, admin.email);

    await request(app).patch(`/api/v1/hotels/${hotelId}/approve`).set('Authorization', `Bearer ${adminToken}`);

    const stillHiddenRes = await request(app).get('/api/v1/hotels?city=Deoghar');
    expect(stillHiddenRes.body.data.hotels.find((h: { name: string }) => h.name === 'Baidyanath Palace')).toBeUndefined();

    await request(app)
      .post(`/api/v1/hotels/${hotelId}/rooms`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('name', 'Deluxe Room')
      .field('type', 'Deluxe')
      .field('adults', '2')
      .field('basePrice', '1500')
      .field('totalRooms', '3');

    const searchRes = await request(app).get('/api/v1/hotels?city=Deoghar');
    const found = searchRes.body.data.hotels.find((h: { name: string }) => h.name === 'Baidyanath Palace');
    expect(found).toBeDefined();
    expect(found.startingPrice).toBe(1500);
  });

  it('filters search results by minimum guest capacity', async () => {
    const owner = await registerAndLogin('hotel_owner');
    const createRes = await request(app)
      .post('/api/v1/hotels')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('name', 'Small Rooms Only')
      .field('description', 'Cozy rooms for solo travelers and couples.')
      .field('address', JSON.stringify({ street: '3 Temple Rd', city: 'Deoghar', state: 'Jharkhand', pincode: '814112' }))
      .field('coordinates', JSON.stringify([86.7, 24.48]))
      .field('amenities', JSON.stringify([]))
      .field('contactNumber', '9876543212')
      .field('contactEmail', 'small@test.com')
      .field('cancellationPolicy', 'Free cancellation up to 24 hours before check-in.')
      .attach('images', Buffer.from('fake-image-bytes'), 'room.jpg');

    const hotelId = createRes.body.data._id;
    const admin = await registerAndLogin('customer');
    const adminToken = await promoteToAdmin(admin.userId, admin.email);
    await request(app).patch(`/api/v1/hotels/${hotelId}/approve`).set('Authorization', `Bearer ${adminToken}`);

    await request(app)
      .post(`/api/v1/hotels/${hotelId}/rooms`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('name', 'Cozy Double')
      .field('type', 'Standard')
      .field('adults', '2')
      .field('basePrice', '1000')
      .field('totalRooms', '5');

    const tooManyGuests = await request(app).get('/api/v1/hotels?guests=4');
    expect(tooManyGuests.body.data.hotels.find((h: { name: string }) => h.name === 'Small Rooms Only')).toBeUndefined();

    const fittingGuests = await request(app).get('/api/v1/hotels?guests=2');
    expect(fittingGuests.body.data.hotels.find((h: { name: string }) => h.name === 'Small Rooms Only')).toBeDefined();
  });
});
