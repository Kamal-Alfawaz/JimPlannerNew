import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

const ExerciseItem = React.memo(({ exerciseName, isSelected, onSelect }) => {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: isSelected ? '#ddd' : '#fff',
        padding: 10,
        marginVertical: 2,
      }}
      onPress={() => onSelect(exerciseName)}>
      <Text>{exerciseName}</Text>
    </TouchableOpacity>
  );
});

export default ExerciseItem;