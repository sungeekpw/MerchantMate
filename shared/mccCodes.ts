// Merchant Category Codes (MCCs) - Official Visa/Mastercard Classifications
// Source: Citibank MCC Reference - Official Documentation

export interface MCCCode {
  code: string;
  description: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export const MCC_CATEGORIES = {
  AGRICULTURAL: 'Agricultural Services',
  CONTRACTED: 'Contracted Services', 
  TRANSPORTATION: 'Transportation Services',
  UTILITIES: 'Utility Services',
  RETAIL: 'Retail Outlet Services',
  CLOTHING: 'Clothing Stores',
  FOOD_BEVERAGE: 'Food & Beverage',
  MISCELLANEOUS: 'Miscellaneous Stores',
  BUSINESS: 'Business Services',
  PROFESSIONAL: 'Professional Services',
  GOVERNMENT: 'Government Services',
  TRAVEL: 'Travel & Entertainment'
} as const;

export const MCC_CODES: MCCCode[] = [
  // Agricultural Services (0001-1499)
  { code: '0742', description: 'Veterinary Services', category: MCC_CATEGORIES.AGRICULTURAL, riskLevel: 'low' },
  { code: '0763', description: 'Agricultural Cooperatives', category: MCC_CATEGORIES.AGRICULTURAL, riskLevel: 'low' },
  { code: '0780', description: 'Horticultural and Landscaping Services', category: MCC_CATEGORIES.AGRICULTURAL, riskLevel: 'low' },

  // Contracted Services (1500-2999)
  { code: '1520', description: 'General Contractors-Residential and Commercial', category: MCC_CATEGORIES.CONTRACTED, riskLevel: 'medium' },
  { code: '1711', description: 'Air Conditioning, Heating and Plumbing Contractors', category: MCC_CATEGORIES.CONTRACTED, riskLevel: 'low' },
  { code: '1731', description: 'Electrical Contractors', category: MCC_CATEGORIES.CONTRACTED, riskLevel: 'low' },
  { code: '1740', description: 'Insulation, Masonry, Plastering, Stonework and Tile Setting Contractors', category: MCC_CATEGORIES.CONTRACTED, riskLevel: 'low' },
  { code: '1750', description: 'Carpentry Contractors', category: MCC_CATEGORIES.CONTRACTED, riskLevel: 'low' },
  { code: '1761', description: 'Roofing and Siding, Sheet Metal Work Contractors', category: MCC_CATEGORIES.CONTRACTED, riskLevel: 'low' },
  { code: '1771', description: 'Concrete Work Contractors', category: MCC_CATEGORIES.CONTRACTED, riskLevel: 'low' },
  { code: '1799', description: 'Contractors, Special Trade Contractors-not elsewhere classified', category: MCC_CATEGORIES.CONTRACTED, riskLevel: 'medium' },

  // Transportation Services (4000-4799)
  { code: '4111', description: 'Transportation-Suburban and Local Commuter Passenger, including Ferries', category: MCC_CATEGORIES.TRANSPORTATION, riskLevel: 'low' },
  { code: '4112', description: 'Passenger Railways', category: MCC_CATEGORIES.TRANSPORTATION, riskLevel: 'low' },
  { code: '4119', description: 'Ambulance Services', category: MCC_CATEGORIES.TRANSPORTATION, riskLevel: 'low' },
  { code: '4121', description: 'Taxicabs and Limousines', category: MCC_CATEGORIES.TRANSPORTATION, riskLevel: 'medium' },
  { code: '4131', description: 'Bus Lines', category: MCC_CATEGORIES.TRANSPORTATION, riskLevel: 'low' },
  { code: '4214', description: 'Motor Freight Carriers, Trucking-Local/Long Distance, Moving and Storage Companies', category: MCC_CATEGORIES.TRANSPORTATION, riskLevel: 'low' },
  { code: '4215', description: 'Courier Services-Air and Ground, Freight Forwarders', category: MCC_CATEGORIES.TRANSPORTATION, riskLevel: 'low' },
  { code: '4411', description: 'Cruise Lines', category: MCC_CATEGORIES.TRAVEL, riskLevel: 'medium' },
  { code: '4722', description: 'Travel Agencies and Tour Operators', category: MCC_CATEGORIES.TRAVEL, riskLevel: 'medium' },

  // Utility Services (4800-4999)
  { code: '4812', description: 'Telecommunication Equipment Including Telephone Sales', category: MCC_CATEGORIES.UTILITIES, riskLevel: 'low' },
  { code: '4814', description: 'Telecommunication Services including prepaid phone services and recurring phone services', category: MCC_CATEGORIES.UTILITIES, riskLevel: 'low' },
  { code: '4816', description: 'Computer Network/Information Services', category: MCC_CATEGORIES.UTILITIES, riskLevel: 'low' },
  { code: '4899', description: 'Cable, Satellite, and Other Pay Television and Radio Services', category: MCC_CATEGORIES.UTILITIES, riskLevel: 'low' },
  { code: '4900', description: 'Utilities-Electric, Gas, Heating Oil, Sanitary, Water', category: MCC_CATEGORIES.UTILITIES, riskLevel: 'low' },

  // Retail Outlet Services (5000-5599)
  { code: '5013', description: 'Motor Vehicle Supplies and New Parts', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5021', description: 'Office and Commercial Furniture', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5045', description: 'Computers, Computer Peripheral Equipment, Software', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5094', description: 'Precious Stones and Metals, Watches and Jewelry', category: MCC_CATEGORIES.RETAIL, riskLevel: 'high' },
  { code: '5111', description: 'Stationery, Office Supplies, Printing and Writing Paper', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5122', description: 'Drugs, Drug Proprietors and Druggists Sundries', category: MCC_CATEGORIES.RETAIL, riskLevel: 'medium' },
  { code: '5200', description: 'Home Supply Warehouse Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5211', description: 'Building Materials, Lumber Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5251', description: 'Hardware Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5261', description: 'Lawn and Garden Supply Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5300', description: 'Wholesale Clubs', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5310', description: 'Discount Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5311', description: 'Department Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5411', description: 'Grocery Stores, Supermarkets', category: MCC_CATEGORIES.FOOD_BEVERAGE, riskLevel: 'low' },
  { code: '5441', description: 'Candy, Nut and Confectionery Stores', category: MCC_CATEGORIES.FOOD_BEVERAGE, riskLevel: 'low' },
  { code: '5462', description: 'Bakeries', category: MCC_CATEGORIES.FOOD_BEVERAGE, riskLevel: 'low' },
  { code: '5499', description: 'Miscellaneous Food Stores-Convenience Stores, Markets, Specialty Stores, and Vending Machines', category: MCC_CATEGORIES.FOOD_BEVERAGE, riskLevel: 'low' },
  { code: '5511', description: 'Automobile and Truck Dealers-(New and Used)-Sales, Service, Repairs, Parts', category: MCC_CATEGORIES.RETAIL, riskLevel: 'medium' },
  { code: '5521', description: 'Automobile and Truck Dealers-(Used Only)-Sales', category: MCC_CATEGORIES.RETAIL, riskLevel: 'medium' },
  { code: '5532', description: 'Automotive Tire Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5533', description: 'Automotive Parts and Accessories Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5541', description: 'Service Stations (With or Without Ancillary Services)', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5551', description: 'Boat Dealers', category: MCC_CATEGORIES.RETAIL, riskLevel: 'medium' },
  { code: '5571', description: 'Motorcycle Shops and Dealers', category: MCC_CATEGORIES.RETAIL, riskLevel: 'medium' },

  // Clothing Stores (5600-5699)
  { code: '5611', description: 'Men\'s and Boys\' Clothing and Accessories Stores', category: MCC_CATEGORIES.CLOTHING, riskLevel: 'low' },
  { code: '5621', description: 'Women\'s Ready to Wear Stores', category: MCC_CATEGORIES.CLOTHING, riskLevel: 'low' },
  { code: '5631', description: 'Women\'s Accessory and Specialty Stores', category: MCC_CATEGORIES.CLOTHING, riskLevel: 'low' },
  { code: '5641', description: 'Children\'s and Infants\' Wear Stores', category: MCC_CATEGORIES.CLOTHING, riskLevel: 'low' },
  { code: '5651', description: 'Family Clothing Stores', category: MCC_CATEGORIES.CLOTHING, riskLevel: 'low' },
  { code: '5655', description: 'Sports Apparel, and Riding Apparel Stores', category: MCC_CATEGORIES.CLOTHING, riskLevel: 'low' },
  { code: '5661', description: 'Shoe Stores', category: MCC_CATEGORIES.CLOTHING, riskLevel: 'low' },
  { code: '5691', description: 'Men\'s and Women\'s Clothing Stores', category: MCC_CATEGORIES.CLOTHING, riskLevel: 'low' },

  // Food & Beverage / Entertainment (5700-7299)
  { code: '5712', description: 'Furniture, Home Furnishings and Equipment Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5722', description: 'Household Appliance Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5732', description: 'Electronics Sales', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5733', description: 'Music Stores-Musical Instruments, Pianos and Sheet Music', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5734', description: 'Computer Software Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5811', description: 'Caterers', category: MCC_CATEGORIES.FOOD_BEVERAGE, riskLevel: 'low' },
  { code: '5812', description: 'Eating Places and Restaurants', category: MCC_CATEGORIES.FOOD_BEVERAGE, riskLevel: 'low' },
  { code: '5813', description: 'Bars, Cocktail Lounges, Discotheques, Nightclubs and Taverns-Drinking Places (Alcoholic Beverages)', category: MCC_CATEGORIES.FOOD_BEVERAGE, riskLevel: 'medium' },
  { code: '5814', description: 'Fast Food Restaurants', category: MCC_CATEGORIES.FOOD_BEVERAGE, riskLevel: 'low' },
  { code: '5815', description: 'Digital Goods: Books, Movies, Music', category: MCC_CATEGORIES.MISCELLANEOUS, riskLevel: 'low' },
  { code: '5816', description: 'Digital Goods: Games', category: MCC_CATEGORIES.MISCELLANEOUS, riskLevel: 'low' },
  { code: '5817', description: 'Digital Goods: Applications (Excludes Games)', category: MCC_CATEGORIES.MISCELLANEOUS, riskLevel: 'low' },
  { code: '5912', description: 'Drug Stores and Pharmacies', category: MCC_CATEGORIES.RETAIL, riskLevel: 'medium' },
  { code: '5921', description: 'Package Stores-Beer, Wine and Liquor', category: MCC_CATEGORIES.FOOD_BEVERAGE, riskLevel: 'medium' },
  { code: '5931', description: 'Second Hand Stores, Used Merchandise Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5932', description: 'Antique Shops-Sales, Repairs and Restoration', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5940', description: 'Bicycle Shops-Sales and Service', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5941', description: 'Sporting Goods Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5942', description: 'Book Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5943', description: 'Office, School Supply and Stationery Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5944', description: 'Clock, Jewelry, Watch and Silverware Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'high' },
  { code: '5945', description: 'Game, Toy and Hobby Shops', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5946', description: 'Camera and Photographic Supply Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5947', description: 'Card, Gift, Novelty and Souvenir Shops', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5948', description: 'Leather Goods and Luggage Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5962', description: 'Direct Marketing-Travel Related Arrangement Services', category: MCC_CATEGORIES.TRAVEL, riskLevel: 'medium' },
  { code: '5964', description: 'Direct Marketing-Catalog Merchants', category: MCC_CATEGORIES.RETAIL, riskLevel: 'medium' },
  { code: '5965', description: 'Direct Marketing-Combination Catalog and Retail Merchant', category: MCC_CATEGORIES.RETAIL, riskLevel: 'medium' },
  { code: '5966', description: 'Direct Marketing-Outbound Telemarketing Merchants', category: MCC_CATEGORIES.RETAIL, riskLevel: 'high' },
  { code: '5967', description: 'Direct Marketing-Inbound Telemarketing Merchants', category: MCC_CATEGORIES.RETAIL, riskLevel: 'high' },
  { code: '5968', description: 'Direct Marketing-Continuity/Subscription Merchants', category: MCC_CATEGORIES.RETAIL, riskLevel: 'high' },
  { code: '5969', description: 'Direct Marketing-Other Direct Marketers-Not Elsewhere Classified', category: MCC_CATEGORIES.RETAIL, riskLevel: 'high' },
  { code: '5977', description: 'Cosmetic Stores', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5992', description: 'Florists', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5995', description: 'Pet Shops, Pet Food and Supplies', category: MCC_CATEGORIES.RETAIL, riskLevel: 'low' },
  { code: '5999', description: 'Miscellaneous and Specialty Retail Stores', category: MCC_CATEGORIES.MISCELLANEOUS, riskLevel: 'low' },

  // Business Services (7300-7999)
  { code: '7311', description: 'Advertising Services', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7321', description: 'Consumer Credit Reporting Agencies', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'medium' },
  { code: '7332', description: 'Blueprint and Photocopying Services', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7333', description: 'Commercial Art, Graphics, and Photography', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7338', description: 'Quick Copy and Reproduction Services', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7339', description: 'Stenographic and Secretarial Support Services', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7342', description: 'Exterminating and Disinfecting Services', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7349', description: 'Cleaning and Maintenance, Janitorial Services', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7361', description: 'Employment Agencies, Temporary Help Services', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7372', description: 'Computer Programming, Data Processing, and Integrated Systems Design Services', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7375', description: 'Information Retrieval Services', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7379', description: 'Computer Maintenance, Repair, and Services-Not Elsewhere Classified', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7392', description: 'Management, Consulting, and Public Relations Services', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7394', description: 'Equipment, Tool, Furniture and Appliance Rental and Leasing', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },
  { code: '7399', description: 'Business Services-Not Elsewhere Classified', category: MCC_CATEGORIES.BUSINESS, riskLevel: 'low' },

  // Professional Services (8000-8999)
  { code: '8011', description: 'Doctors, Medical Practitioners-not elsewhere classified', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8021', description: 'Dentists, Orthodontists', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8031', description: 'Osteopaths', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8041', description: 'Chiropractors', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8042', description: 'Optometrists, Ophthalmologists', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8043', description: 'Opticians, Optical Goods and Eyeglasses', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8049', description: 'Podiatrists, Chiropodists', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8050', description: 'Nursing and Personal Care Facilities', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8062', description: 'Hospitals', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8071', description: 'Medical and Dental Laboratories', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8099', description: 'Medical Services and Health Practitioners-Not Elsewhere Classified', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8111', description: 'Legal Services, Attorneys', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8211', description: 'Elementary and Secondary Schools', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8220', description: 'Colleges, Universities, Professional Schools, and Junior Colleges', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8241', description: 'Correspondence Schools', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'medium' },
  { code: '8244', description: 'Business and Secretarial Schools', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8249', description: 'Trade and Vocational Schools', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8299', description: 'Schools and Educational Services-Not Elsewhere Classified', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8351', description: 'Child Care Services', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8398', description: 'Charitable and Social Service Organizations', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8641', description: 'Civic, Social, and Fraternal Associations', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8651', description: 'Political Organizations', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'medium' },
  { code: '8661', description: 'Religious Organizations', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8699', description: 'Membership Organizations-Not Elsewhere Classified', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8734', description: 'Testing Laboratories (Non-Medical)', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8911', description: 'Architectural, Engineering, and Surveying Services', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8931', description: 'Accounting, Auditing, and Bookkeeping Services', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' },
  { code: '8999', description: 'Professional Services-Not Elsewhere Classified', category: MCC_CATEGORIES.PROFESSIONAL, riskLevel: 'low' }
];

// Helper functions for working with MCC codes
export const getMCCByCode = (code: string): MCCCode | undefined => {
  return MCC_CODES.find(mcc => mcc.code === code);
};

export const getMCCsByCategory = (category: string): MCCCode[] => {
  return MCC_CODES.filter(mcc => mcc.category === category);
};

export const getMCCsByRiskLevel = (riskLevel: 'low' | 'medium' | 'high'): MCCCode[] => {
  return MCC_CODES.filter(mcc => mcc.riskLevel === riskLevel);
};

export const searchMCCs = (searchTerm: string): MCCCode[] => {
  const term = searchTerm.toLowerCase();
  return MCC_CODES.filter(mcc => 
    mcc.description.toLowerCase().includes(term) ||
    mcc.code.includes(term) ||
    mcc.category.toLowerCase().includes(term)
  );
};

export const getPopularMCCs = (): MCCCode[] => {
  // Return commonly used MCC codes for quick selection
  const popularCodes = [
    '5812', // Eating Places and Restaurants
    '5814', // Fast Food Restaurants
    '5411', // Grocery Stores, Supermarkets
    '5941', // Sporting Goods Stores
    '5999', // Miscellaneous and Specialty Retail Stores
    '7372', // Computer Programming, Data Processing, and Integrated Systems Design Services
    '8011', // Doctors, Medical Practitioners
    '8021', // Dentists, Orthodontists
    '8111', // Legal Services, Attorneys
    '5732', // Electronics Sales
    '5311', // Department Stores
    '1711', // Air Conditioning, Heating and Plumbing Contractors
    '1731', // Electrical Contractors
    '5541', // Service Stations
    '7392'  // Management, Consulting, and Public Relations Services
  ];
  
  return popularCodes.map(code => getMCCByCode(code)!).filter(Boolean);
};