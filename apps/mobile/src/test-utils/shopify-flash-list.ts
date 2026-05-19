export const createFlashListMock = () => ({
  FlashList: jest.requireActual('react-native').FlatList,
});
