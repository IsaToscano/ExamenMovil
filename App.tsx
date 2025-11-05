import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  PermissionsAndroid,
  Alert,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarChart, PieChart } from 'react-native-chart-kit';
import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';

const App = () => {
  const [activeTab, setActiveTab] = useState('register');
  const [moodRating, setMoodRating] = useState(3);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [activities, setActivities] = useState([]);
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [moodEntries, setMoodEntries] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('week');

  // Inicializar notificaciones
  useEffect(() => {
    requestNotificationPermission();
    configureNotifications();
    loadData();
    scheduleReminder();
  }, []);

  const requestNotificationPermission = async () => {
    await notifee.requestPermission();
  };

  const configureNotifications = async () => {
    await notifee.createChannel({
      id: 'mood-tracker-channel',
      name: 'Recordatorios de estado de ánimo',
      description: 'Canal para recordatorios diarios',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  };

  const scheduleReminder = async () => {
    const reminderInterval = 120; // 2 minutos para pruebas

    await notifee.createTriggerNotification(
      {
        title: '🌟 Registra tu estado de ánimo',
        body: 'Han pasado 2 minutos. ¿Cómo te sientes hoy?',
        android: {
          channelId: 'mood-tracker-channel',
          importance: AndroidImportance.HIGH,
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + reminderInterval * 1000,
        repeatFrequency: TriggerType.INTERVAL,
        alarmManager: {
          allowWhileIdle: true,
        },
      }
    );
  };

  const loadData = async () => {
    try {
      const storedActivities = await AsyncStorage.getItem('activities');
      const storedPlaces = await AsyncStorage.getItem('places');
      const storedEvents = await AsyncStorage.getItem('events');
      const storedEntries = await AsyncStorage.getItem('moodEntries');

      setActivities(storedActivities ? JSON.parse(storedActivities) : [
        'Salir de fiesta', 'Ir al cine', 'Salir a correr', 'Ejercicio', 'Leer'
      ]);
      setPlaces(storedPlaces ? JSON.parse(storedPlaces) : [
        'Parque', 'Plaza', 'Centro comercial', 'Casa', 'Trabajo'
      ]);
      setEvents(storedEvents ? JSON.parse(storedEvents) : [
        'Reunión social', 'Celebración', 'Cita médica', 'Trabajo', 'Estudio'
      ]);
      setMoodEntries(storedEntries ? JSON.parse(storedEntries) : []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const saveData = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error guardando datos:', error);
    }
  };

  const saveMoodEntry = async () => {
    const newEntry = {
      id: Date.now().toString(),
      date: selectedDate.toISOString(),
      rating: moodRating,
      activities: selectedActivities,
      places: selectedPlaces,
      events: selectedEvents,
      notes: notes,
    };

    const updatedEntries = [...moodEntries, newEntry];
    setMoodEntries(updatedEntries);
    await saveData('moodEntries', updatedEntries);

    Alert.alert('¡Guardado!', 'Tu registro ha sido guardado exitosamente');
    resetForm();
  };

  const resetForm = () => {
    setMoodRating(3);
    setSelectedActivities([]);
    setSelectedPlaces([]);
    setSelectedEvents([]);
    setNotes('');
  };

  const addNewItem = async () => {
    if (newItemText.trim() === '') return;

    let updatedArray;
    if (addType === 'activity') {
      updatedArray = [...activities, newItemText];
      setActivities(updatedArray);
      await saveData('activities', updatedArray);
    } else if (addType === 'place') {
      updatedArray = [...places, newItemText];
      setPlaces(updatedArray);
      await saveData('places', updatedArray);
    } else if (addType === 'event') {
      updatedArray = [...events, newItemText];
      setEvents(updatedArray);
      await saveData('events', updatedArray);
    }

    setNewItemText('');
    setShowAddModal(false);
  };

  const toggleSelection = (item, array, setArray) => {
    if (array.includes(item)) {
      setArray(array.filter((i) => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const getMoodLabel = (rating) => {
    if (rating <= 2) return 'Bajo';
    if (rating <= 3) return 'Neutral';
    return 'Alto';
  };

  const getChartData = () => {
    if (moodEntries.length === 0) return null;

    const now = new Date();
    let filteredEntries = [];
    let labels = [];

    if (chartPeriod === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredEntries = moodEntries.filter(
        (entry) => new Date(entry.date) >= sevenDaysAgo
      );
      labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    } else if (chartPeriod === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredEntries = moodEntries.filter(
        (entry) => new Date(entry.date) >= thirtyDaysAgo
      );
      labels = ['S1', 'S2', 'S3', 'S4'];
    }

    const avgByPeriod = labels.map((_, index) => {
      const relevantEntries = filteredEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        if (chartPeriod === 'week') {
          return entryDate.getDay() === index;
        } else {
          const weekNumber = Math.floor(
            (now.getTime() - entryDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
          );
          return weekNumber === index;
        }
      });

      if (relevantEntries.length === 0) return 0;
      const sum = relevantEntries.reduce((acc, e) => acc + e.rating, 0);
      return sum / relevantEntries.length;
    });

    return {
      labels,
      datasets: [{ data: avgByPeriod }],
    };
  };

  const getPieChartData = () => {
    if (moodEntries.length === 0) return [];

    const moodCounts = { Bajo: 0, Neutral: 0, Alto: 0 };
    moodEntries.forEach((entry) => {
      const label = getMoodLabel(entry.rating);
      moodCounts[label]++;
    });

    return [
      {
        name: 'Bajo',
        population: moodCounts.Bajo,
        color: '#ef4444',
        legendFontColor: '#333',
        legendFontSize: 14,
      },
      {
        name: 'Neutral',
        population: moodCounts.Neutral,
        color: '#f59e0b',
        legendFontColor: '#333',
        legendFontSize: 14,
      },
      {
        name: 'Alto',
        population: moodCounts.Alto,
        color: '#10b981',
        legendFontColor: '#333',
        legendFontSize: 14,
      },
    ];
  };

  const renderRegisterTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Fecha</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}>
        <Text style={styles.dateButtonText}>
          {selectedDate.toLocaleDateString('es-MX')}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      <Text style={styles.sectionTitle}>¿Cómo te sientes? (1-5)</Text>
      <View style={styles.moodContainer}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <TouchableOpacity
            key={rating}
            style={[
              styles.moodButton,
              moodRating === rating && styles.moodButtonActive,
            ]}
            onPress={() => setMoodRating(rating)}>
            <Text
              style={[
                styles.moodButtonText,
                moodRating === rating && styles.moodButtonTextActive,
              ]}>
              {rating}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.moodLabel}>Estado: {getMoodLabel(moodRating)}</Text>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Actividades</Text>
        <TouchableOpacity
          onPress={() => {
            setAddType('activity');
            setShowAddModal(true);
          }}>
          <Text style={styles.addButton}>+ Agregar</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chipContainer}>
        {activities.map((activity) => (
          <TouchableOpacity
            key={activity}
            style={[
              styles.chip,
              selectedActivities.includes(activity) && styles.chipSelected,
            ]}
            onPress={() =>
              toggleSelection(activity, selectedActivities, setSelectedActivities)
            }>
            <Text
              style={[
                styles.chipText,
                selectedActivities.includes(activity) && styles.chipTextSelected,
              ]}>
              {activity}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lugares</Text>
        <TouchableOpacity
          onPress={() => {
            setAddType('place');
            setShowAddModal(true);
          }}>
          <Text style={styles.addButton}>+ Agregar</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chipContainer}>
        {places.map((place) => (
          <TouchableOpacity
            key={place}
            style={[
              styles.chip,
              selectedPlaces.includes(place) && styles.chipSelected,
            ]}
            onPress={() => toggleSelection(place, selectedPlaces, setSelectedPlaces)}>
            <Text
              style={[
                styles.chipText,
                selectedPlaces.includes(place) && styles.chipTextSelected,
              ]}>
              {place}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Eventos</Text>
        <TouchableOpacity
          onPress={() => {
            setAddType('event');
            setShowAddModal(true);
          }}>
          <Text style={styles.addButton}>+ Agregar</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chipContainer}>
        {events.map((event) => (
          <TouchableOpacity
            key={event}
            style={[
              styles.chip,
              selectedEvents.includes(event) && styles.chipSelected,
            ]}
            onPress={() => toggleSelection(event, selectedEvents, setSelectedEvents)}>
            <Text
              style={[
                styles.chipText,
                selectedEvents.includes(event) && styles.chipTextSelected,
              ]}>
              {event}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Notas</Text>
      <TextInput
        style={styles.notesInput}
        multiline
        numberOfLines={4}
        value={notes}
        onChangeText={setNotes}
        placeholder="Escribe tus notas aquí..."
      />

      <TouchableOpacity style={styles.saveButton} onPress={saveMoodEntry}>
        <Text style={styles.saveButtonText}>Guardar registro</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderAnalysisTab = () => {
    const barChartData = getChartData();
    const pieChartData = getPieChartData();

    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Análisis de estado de ánimo</Text>

        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              chartPeriod === 'week' && styles.periodButtonActive,
            ]}
            onPress={() => setChartPeriod('week')}>
            <Text
              style={[
                styles.periodButtonText,
                chartPeriod === 'week' && styles.periodButtonTextActive,
              ]}>
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              chartPeriod === 'month' && styles.periodButtonActive,
            ]}
            onPress={() => setChartPeriod('month')}>
            <Text
              style={[
                styles.periodButtonText,
                chartPeriod === 'month' && styles.periodButtonTextActive,
              ]}>
              Mes
            </Text>
          </TouchableOpacity>
        </View>

        {barChartData && barChartData.datasets[0].data.some((v) => v > 0) ? (
          <>
            <Text style={styles.chartTitle}>Promedio de ánimo</Text>
            <BarChart
              data={barChartData}
              width={Dimensions.get('window').width - 40}
              height={220}
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                },
              }}
              style={styles.chart}
            />
          </>
        ) : (
          <Text style={styles.noDataText}>
            No hay datos suficientes para mostrar la gráfica de barras
          </Text>
        )}

        {pieChartData.length > 0 &&
        pieChartData.some((item) => item.population > 0) ? (
          <>
            <Text style={styles.chartTitle}>Distribución de estados</Text>
            <PieChart
              data={pieChartData}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              style={styles.chart}
            />
          </>
        ) : (
          <Text style={styles.noDataText}>
            No hay datos suficientes para mostrar la distribución
          </Text>
        )}

        <Text style={styles.sectionTitle}>Registros recientes</Text>
        {moodEntries.slice(-5).reverse().map((entry) => (
          <View key={entry.id} style={styles.entryCard}>
            <Text style={styles.entryDate}>
              {new Date(entry.date).toLocaleDateString('es-MX')}
            </Text>
            <Text style={styles.entryMood}>
              Estado: {getMoodLabel(entry.rating)} ({entry.rating}/5)
            </Text>
            {entry.notes && (
              <Text style={styles.entryNotes}>{entry.notes}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monitor de ánimo</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'register' && styles.tabActive]}
          onPress={() => setActiveTab('register')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'register' && styles.tabTextActive,
            ]}>
            Registrar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analysis' && styles.tabActive]}
          onPress={() => setActiveTab('analysis')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'analysis' && styles.tabTextActive,
            ]}>
            Análisis
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'register' ? renderRegisterTab() : renderAnalysisTab()}

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Agregar{' '}
              {addType === 'activity'
                ? 'Actividad'
                : addType === 'place'
                ? 'Lugar'
                : 'Evento'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={newItemText}
              onChangeText={setNewItemText}
              placeholder="Escribe aquí..."
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewItemText('');
                }}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={addNewItem}>
                <Text style={styles.modalButtonTextPrimary}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  addButton: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  moodButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  moodButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  moodButtonTextActive: {
    color: '#ffffff',
  },
  moodLabel: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  chip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  chipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    color: '#6b7280',
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    marginVertical: 16,
  },
  periodButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  periodButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  periodButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: '#6b7280',
    marginVertical: 24,
    fontSize: 14,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  entryDate: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  entryMood: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
  },
  entryNotes: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#f3f4f6',
  },
  modalButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  modalButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;