const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Setup a fresh database before each test
setupDB();

describe('Account Model', () => {
  // Test account creation and validation
  it('should create an account with valid fields', async () => {
    const accountData = {
      name: 'Test Account',
      type: 'asset',
      description: 'Test description'
    };

    const account = new Account(accountData);
    const savedAccount = await account.save();
    
    expect(savedAccount._id).toBeDefined();
    expect(savedAccount.name).toBe(accountData.name);
    expect(savedAccount.type).toBe(accountData.type);
    expect(savedAccount.description).toBe(accountData.description);
    expect(savedAccount.isActive).toBe(true); // Default value
    expect(savedAccount.parent).toBeNull(); // Default value
    expect(savedAccount.createdAt).toBeDefined();
    expect(savedAccount.updatedAt).toBeDefined();
  });

  it('should fail validation without required fields', async () => {
    const account = new Account({
      // Missing name
      type: 'asset'
    });

    let validationError;
    try {
      await account.save();
    } catch (error) {
      validationError = error;
    }

    expect(validationError).toBeDefined();
    expect(validationError.name).toBe('ValidationError');
    expect(validationError.errors.name).toBeDefined();
  });

  it('should fail validation with invalid account type', async () => {
    const account = new Account({
      name: 'Invalid Account',
      type: 'invalid-type' // Invalid account type
    });

    let validationError;
    try {
      await account.save();
    } catch (error) {
      validationError = error;
    }

    expect(validationError).toBeDefined();
    expect(validationError.name).toBe('ValidationError');
    expect(validationError.errors.type).toBeDefined();
  });

  // Test the updatedAt field is set on save
  it('should update the updatedAt field on save', async () => {
    // Create the account using create which returns a saved document
    const account = await Account.create({
      name: 'Update Test Account',
      type: 'asset'
    });
    
    // Store original values
    const accountId = account._id;
    const originalUpdatedAt = account.updatedAt;
    
    // Wait a bit to ensure timestamps are different
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Retrieve the account again
    const fetchedAccount = await Account.findById(accountId);
    
    // Update properties and save using .save() to trigger middleware
    fetchedAccount.name = 'Modified Name';
    await fetchedAccount.save();
    
    // Verify update worked and updatedAt changed
    expect(fetchedAccount.name).toBe('Modified Name');
    expect(fetchedAccount.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  // Test virtual population of children
  it('should populate virtual children field', async () => {
    // Create parent account
    const parent = await Account.create({
      name: 'Parent Account',
      type: 'asset'
    });
    
    // Create child accounts
    await Account.create({
      name: 'Child 1',
      type: 'asset',
      parent: parent._id
    });
    
    await Account.create({
      name: 'Child 2',
      type: 'asset',
      parent: parent._id
    });
    
    // Find parent with populated children
    const populatedParent = await Account.findById(parent._id).populate('children');
    
    expect(populatedParent.children).toBeDefined();
    expect(populatedParent.children.length).toBe(2);
    expect(populatedParent.children[0].name).toContain('Child');
    expect(populatedParent.children[1].name).toContain('Child');
  });
}); 