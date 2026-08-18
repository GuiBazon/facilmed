import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Clock, 
  ListOrdered, 
  Users, 
  Stethoscope, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import NovoMedicoModal from '../components/NovoMedicoModal';
import GradeHorariosModal from '../components/GradeHorariosModal';

export default function AdminDashboard() {
  const [medicos, setMedicos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [filaEspera, setFilaEspera] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showNovoMedico, setShowNovoMedico] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [espData, medData, filaData] = await Promise.all([
        api.getEspecialidades(),
        api.getMedicos(),
        api.getFilaEspera()
      ]);
      setEspecialidades(espData);
      setMedicos(medData);
      setFilaEspera(filaData);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados administrativos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // Polling a cada 15s para fila
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border border-teal-900/50">
        <div>
          <div className="inline-flex items-center gap-2 bg-teal-500/20 px-3 py-1 rounded-full text-xs font-semibold text-teal-300 mb-3 border border-teal-500/30">
            <ShieldCheck className="w-4 h-4" />
            Portal Administrativo
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Gestão Clínica FácilMed
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Cadastro de profissionais, configuração de grades e monitor de fila de espera em tempo real.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowNovoMedico(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-600/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar Médico
          </button>
          <button
            onClick={() => setShowGradeModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition"
          >
            <Clock className="w-4 h-4" />
            Adicionar Turno
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Doctors & Waiting Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Doctors List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Corpo Clínico Cadastrado ({medicos.length})
            </h2>
            <button onClick={loadData} className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {medicos.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">Nenhum médico cadastrado.</div>
            ) : (
              medicos.map((med) => (
                <div key={med.id} className="p-4.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-teal-100/70 text-teal-800 flex items-center justify-center font-bold text-base shrink-0">
                      {med.medico_nome?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{med.medico_nome}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          {med.especialidade}
                        </span>
                        <span>CRM: {med.crm}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 sm:text-right">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Consulta</span>
                      <span className="text-slate-900 font-bold text-sm">R$ {Number(med.valor_consulta || 150).toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => setShowGradeModal(true)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                    >
                      Configurar Grade
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-Time Waiting Queue Monitor (1 col) */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-amber-600" />
              Fila de Espera Dinâmica (RN03)
            </h2>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              {filaEspera.length}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pacientes aguardando vagas abertas por cancelamentos. O sistema notifica o 1º da fila com timeout de 60 minutos.
            </p>

            {filaEspera.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum paciente aguardando na fila.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {filaEspera.map((item) => {
                  const isNotif = item.status === 'NOTIFICADO';
                  const isExp = item.status === 'EXPIRADO';
                  const isConf = item.status === 'CONFIRMADO';

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border text-xs transition ${
                        isNotif
                          ? 'bg-amber-50/70 border-amber-300'
                          : isExp
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : isConf
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-800">{item.paciente_nome}</span>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            isNotif
                              ? 'bg-amber-200 text-amber-900 animate-pulse'
                              : isExp
                              ? 'bg-slate-200 text-slate-700'
                              : isConf
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <p>Médico: <strong className="text-slate-700">{item.medico_nome}</strong></p>
                        <p>Data Desejada: <strong className="text-slate-700">{item.data_desejada}</strong></p>
                        <p>Posição na Fila: <strong className="text-teal-700">#{item.posicao_fila}</strong></p>
                        {item.horario_notificacao && (
                          <p className="text-amber-700 font-mono text-[10px]">
                            Notificado em: {item.horario_notificacao.substring(11, 16)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      {showNovoMedico && (
        <NovoMedicoModal
          especialidades={especialidades}
          onClose={() => setShowNovoMedico(false)}
          onSuccess={loadData}
        />
      )}

      {showGradeModal && (
        <GradeHorariosModal
          medicos={medicos}
          onClose={() => setShowGradeModal(false)}
          onSuccess={loadData}
        />
      )}

    </div>
  );
}
