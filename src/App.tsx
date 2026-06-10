import './App.css';
import PageShell from './components/PageShell/PageShell';
import DoctorInstructionsCard from './components/DoctorInstructionsCard';

export default function App() {
  return (
    <PageShell>
      <DoctorInstructionsCard patientId="pat001" />
    </PageShell>
  );
}
