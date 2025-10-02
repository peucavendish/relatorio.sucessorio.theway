import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { useSectionVisibility } from '@/context/SectionVisibilityContext';

interface UserReports {
  cliente?: {
    nome?: string;
    email?: string;
  };
}

interface FloatingActionsProps {
  className?: string;
  userReports?: UserReports;
}

const FloatingActions: React.FC<FloatingActionsProps> = ({ className, userReports }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<{
    email: string;
    password: string;
    session_id: string;
  } | null>(null);

  // Hooks dos contextos de visibilidade
  const { hiddenCards } = useCardVisibility();
  const { hiddenSections } = useSectionVisibility();

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  const isValidEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      const apiUrl = import.meta.env.VITE_API_THE_WAY;
      const response = await axios.post(`${apiUrl}/gerar-relatorio-cliente`, {
        name: userReports?.cliente?.nome,
        email: email,
        session_id: sessionId,
        hiddenSections: hiddenSections,
        hiddenCards: hiddenCards
      });

      if (response.status === 200) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setReportData(null);
    setEmail('');
  };

  return (
    <>
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 flex flex-col gap-3',
          className
        )}
      >
        <button
          onClick={handleOpenDialog}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-accent text-white shadow-lg hover:bg-accent/90 transition-colors"
          aria-label="Generate Client Report"
        >
          <FileText size={18} />
        </button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Gerar Relatório do Cliente</DialogTitle>
            <DialogDescription>
              {!reportData ? 'Insira o email para gerar o relatório' : 'Use as informações abaixo para acessar o relatório do cliente'}
            </DialogDescription>
          </DialogHeader>

          {!reportData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite o email do cliente"
                  className="w-full"
                  required
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  title="Por favor, insira um email válido"
                />
              </div>
              <Button
                onClick={handleGenerateReport}
                disabled={!isValidEmail(email) || isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Link:</span>
                  <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md">
                    <span className="text-sm">{`https://relatorio.theway.altavistainvest.com.br/relatorio-cliente/?sessionId=${sessionId}`}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(`https://relatorio.theway.altavistainvest.com.br/relatorio-cliente/?sessionId=${sessionId}`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Email:</span>
                  <div className="flex items-center gap-2">
                    <span>{reportData.email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(reportData.email)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Senha:</span>
                  <div className="flex items-center gap-2">
                    <span>{reportData.password}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(reportData.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingActions;
