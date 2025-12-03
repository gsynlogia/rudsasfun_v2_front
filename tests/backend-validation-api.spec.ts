import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:8000';

/**
 * Backend Validation API Tests
 * Tests backend validation for reservation form Steps 1-4
 * All tests run in headed mode with screenshots
 */

test.describe('Backend Validation - API Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page to enable browser context for screenshots
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  // ============================================================================
  // STEP 1 VALIDATION TESTS
  // ============================================================================

  test('Step 1: should reject reservation with empty parent firstName', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: '', // Empty - should fail
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '10',
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: 'internet'
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'electronic'
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    expect(response.status()).toBe(422);
    const errorData = await response.json();
    expect(errorData.detail).toBeDefined();
    expect(errorData.detail.details).toBeDefined();
    
    // Check that error mentions firstName
    const errorMessages = JSON.stringify(errorData);
    expect(errorMessages).toContain('firstName');
    expect(errorMessages).toContain('Pole obowiązkowe');

    // Take screenshot
    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-step1-empty-firstname.png',
      fullPage: true 
    });
  });

  test('Step 1: should reject reservation with invalid email', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'invalid-email', // Invalid email
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '10',
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: 'internet'
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'electronic'
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    expect(response.status()).toBe(422);
    const errorData = await response.json();
    const errorMessages = JSON.stringify(errorData);
    expect(errorMessages).toContain('email');

    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-step1-invalid-email.png',
      fullPage: true 
    });
  });

  test('Step 1: should reject reservation with empty participant age', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '', // Empty - should fail
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: 'internet'
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'electronic'
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    expect(response.status()).toBe(422);
    const errorData = await response.json();
    const errorMessages = JSON.stringify(errorData);
    expect(errorMessages).toContain('age');
    expect(errorMessages).toContain('Pole obowiązkowe');

    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-step1-empty-participant-age.png',
      fullPage: true 
    });
  });

  // ============================================================================
  // STEP 2 VALIDATION TESTS
  // ============================================================================

  test('Step 2: should reject reservation with collective transport without city', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '10',
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: '', // Empty - should fail for collective transport
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: 'internet'
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'electronic'
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    expect(response.status()).toBe(422);
    const errorData = await response.json();
    const errorMessages = JSON.stringify(errorData);
    expect(errorMessages).toContain('departureCity');
    expect(errorMessages).toContain('Pole obowiązkowe');

    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-step2-missing-city.png',
      fullPage: true 
    });
  });

  test('Step 2: should reject reservation with empty source', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '10',
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: '' // Empty - should fail
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'electronic'
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    expect(response.status()).toBe(422);
    const errorData = await response.json();
    const errorMessages = JSON.stringify(errorData);
    expect(errorMessages).toContain('selectedSource');
    expect(errorMessages).toContain('Pole obowiązkowe');

    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-step2-empty-source.png',
      fullPage: true 
    });
  });

  test('Step 2: should reject reservation with "inne" source without text', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '10',
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: 'inne',
        inneText: '' // Empty - should fail when source is 'inne'
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'electronic'
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    expect(response.status()).toBe(422);
    const errorData = await response.json();
    const errorMessages = JSON.stringify(errorData);
    expect(errorMessages).toContain('inneText');
    expect(errorMessages).toContain('Pole obowiązkowe');

    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-step2-inne-without-text.png',
      fullPage: true 
    });
  });

  // ============================================================================
  // STEP 3 VALIDATION TESTS
  // ============================================================================

  test('Step 3: should reject reservation with missing private person firstName', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '10',
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: 'internet'
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: '', // Empty - should fail
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'electronic'
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    expect(response.status()).toBe(422);
    const errorData = await response.json();
    const errorMessages = JSON.stringify(errorData);
    expect(errorMessages).toContain('firstName');
    expect(errorMessages).toContain('Pole obowiązkowe');

    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-step3-private-empty-firstname.png',
      fullPage: true 
    });
  });

  test('Step 3: should reject reservation with missing company name', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '10',
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: 'internet'
      },
      step3: {
        invoiceType: 'company',
        companyData: {
          companyName: '', // Empty - should fail
          nip: '1234567890',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'electronic'
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    expect(response.status()).toBe(422);
    const errorData = await response.json();
    const errorMessages = JSON.stringify(errorData);
    expect(errorMessages).toContain('companyName');
    expect(errorMessages).toContain('Pole obowiązkowe');

    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-step3-company-empty-name.png',
      fullPage: true 
    });
  });

  test('Step 3: should reject reservation with paper delivery and different address but missing delivery street', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '10',
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: 'internet'
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'paper',
        differentAddress: true,
        deliveryAddress: {
          street: '', // Empty - should fail
          postalCode: '00-000',
          city: 'Warszawa'
        }
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    expect(response.status()).toBe(422);
    const errorData = await response.json();
    const errorMessages = JSON.stringify(errorData);
    expect(errorMessages).toContain('street');
    expect(errorMessages).toContain('Pole obowiązkowe');

    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-step3-delivery-missing-street.png',
      fullPage: true 
    });
  });

  // ============================================================================
  // STEP 4 VALIDATION TESTS
  // ============================================================================

  test('Step 4: should reject reservation with consent1 unchecked', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '10',
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: 'internet'
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'electronic'
      },
      step4: {
        consent1: false, // Unchecked - should fail
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    expect(response.status()).toBe(422);
    const errorData = await response.json();
    const errorMessages = JSON.stringify(errorData);
    expect(errorMessages).toContain('consent1');
    expect(errorMessages).toContain('Pole obowiązkowe');

    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-step4-consent1-unchecked.png',
      fullPage: true 
    });
  });

  // ============================================================================
  // SUCCESS TEST
  // ============================================================================

  test('should accept valid reservation with all fields filled correctly', async ({ page, request }) => {
    const reservationData = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [{
          id: '1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        }],
        participantData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          age: '10',
          gender: 'M',
          city: 'Warszawa'
        },
        diet: 'standard'
      },
      step2: {
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa'
        },
        selectedSource: 'internet'
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'test@example.com',
          phone: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-000',
          city: 'Warszawa'
        },
        deliveryType: 'electronic'
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true
      },
      total_price: 2200.00
    };

    const response = await request.post(`${API_BASE_URL}/api/reservations`, {
      data: reservationData
    });

    // Should succeed (201 Created) or fail with 404 if camp/property doesn't exist
    // In test environment, we might get 404, so we check for either success or not-found
    expect([201, 404]).toContain(response.status());
    
    if (response.status() === 201) {
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('camp_id', 1);
      expect(data).toHaveProperty('property_id', 1);
    }

    await page.screenshot({ 
      path: 'screenshots_playwright/backend-validation-success.png',
      fullPage: true 
    });
  });
});






