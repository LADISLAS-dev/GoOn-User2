import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef =
  createNavigationContainerRef();

const pendingActions = [];

function runOrQueue(action) {
  if (navigationRef.isReady()) {
    action();
    return;
  }

  pendingActions.push(action);
  console.log('Navigation not ready, action queued');
}

export function flushPendingNavigationActions() {
  if (!navigationRef.isReady() || pendingActions.length === 0) {
    return;
  }

  const actions = pendingActions.splice(0, pendingActions.length);
  actions.forEach((action) => {
    try {
      action();
    } catch (e) {
      console.warn('Failed to run queued navigation action:', e?.message || e);
    }
  });
}

export function navigate(name, params) {
  runOrQueue(() => {
    navigationRef.navigate(name, params);
  });
}

export function resetRoot(name, params) {
  runOrQueue(() => {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name, params }],
      })
    );
  });
}

export function navigateToAppointmentDetails(appointmentId) {
  runOrQueue(() => {
    navigationRef.navigate('MainTabs', {
      screen: 'CompanyHome',
      params: {
        screen: 'AppointmentDetails',
        params: {
          id: appointmentId,
          appointmentId,
        },
      },
    });
  });
}

export function navigateToMessages(companyId, params = {}) {
  runOrQueue(() => {
    navigationRef.navigate('MainTabs', {
      screen: 'Messages',
      params: {
        ...(companyId ? { companyId } : {}),
        ...params,
      },
    });
  });
}
