import { PickrateForm } from '@/components/pickrate/PickrateForm';
import { PickrateResults } from '@/components/pickrate/PickrateResults';

export default function PickratePage() {
<<<<<<< HEAD
  const [rankLimit, setRankLimit] = useState('');
  const [teamColor, setTeamColor] = useState('');
  const [topN, setTopN] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<any>(null);
  const [sortStates, setSortStates] = useState<Record<string, { key: string; asc: boolean }>>({});
  const [cacheKey, setCacheKey] = useState<string>('');
  const [teamColorSuggestions, setTeamColorSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 팀 컬러 목록 가져오기
  useEffect(() => {
    const fetchTeamColors = async () => {
      try {
        const response = await fetch('/api/pickrate');
        const data = await response.json();
        if (data.teamColors) {
          setTeamColorSuggestions(data.teamColors);
        }
      } catch (error) {
        console.error('팀 컬러 목록을 가져오는 데 실패했습니다:', error);
      }
    };
    fetchTeamColors();
  }, []);

  // 팀 컬러 입력 핸들러
  const handleTeamColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTeamColor(value);
    setShowSuggestions(true);
  };

  // 팀 컬러 선택 핸들러
  const handleTeamColorSelect = (color: string) => {
    setTeamColor(color);
    setShowSuggestions(false);
  };

  // 입력창 클릭 시 초기화 핸들러
  const handleInputClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    setShowSuggestions(input.name === 'teamColor');
    
    // 각 입력창의 상태값 초기화
    if (input.name === 'rankLimit') {
      setRankLimit('');
    } else if (input.name === 'teamColor') {
      setTeamColor('');
    } else if (input.name === 'topN') {
      setTopN('');
    }
  }, []);

  // 캐시된 결과를 가져오는 함수
  const getCachedResult = useCallback(async () => {
    const key = `${rankLimit}-${teamColor}-${topN}`;
    if (key === cacheKey && result) return result;

    const cached = localStorage.getItem(`pickrate-${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // 1시간 이내의 캐시만 사용
      if (Date.now() - timestamp < 3600000) {
        setResult(data);
        setCacheKey(key);
        return data;
      }
    }
    return null;
  }, [rankLimit, teamColor, topN, cacheKey, result]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 캐시된 결과 확인
    const cached = await getCachedResult();
    if (cached) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setProgress(0);
    setProgressMessage('');
    setResult(null);

    try {
      const jobRes = await fetch('/api/pickrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rankLimit: parseInt(rankLimit), 
          teamColor, 
          topN: parseInt(topN) 
        })
      });

      const { jobId } = await jobRes.json();

      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/pickrate?jobId=${jobId}`);
          const data = await res.json();

          if (data.progress !== undefined) {
            setProgress(data.progress);
            setProgressMessage(data.message || '데이터 수집 중');
          }

          if (data.status === 'done') {
            clearInterval(interval);
            setResult(data.result);
            setLoading(false);
            
            // 결과 캐싱
            const key = `${rankLimit}-${teamColor}-${topN}`;
            localStorage.setItem(`pickrate-${key}`, JSON.stringify({
              data: data.result,
              timestamp: Date.now()
            }));
            setCacheKey(key);
          } else if (data.status === 'error') {
            clearInterval(interval);
            setLoading(false);
            alert(data.error || '데이터 수집 중 오류가 발생했습니다.');
          }
        } catch (error) {
          console.error('Error fetching progress:', error);
          clearInterval(interval);
          setLoading(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Error submitting job:', error);
      setLoading(false);
    }
  }, [rankLimit, teamColor, topN, getCachedResult]);

  const handleExport = useCallback(async () => {
    if (!result) return;
    try {
      const res = await fetch('/api/pickrate/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: result.summary,
          userCount: result.userCount,
          teamColor
        })
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pickrate_report.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }, [result, teamColor]);

  const toggleSort = useCallback((positionGroup: string, key: string) => {
    setSortStates(prev => ({
      ...prev,
      [positionGroup]: {
        key,
        asc: prev[positionGroup]?.key === key ? !prev[positionGroup]?.asc : true
      }
    }));
  }, []);

  const sortedPlayers = useCallback((players: any[], positionGroup: string) => {
    const sortState = sortStates[positionGroup];
    if (!sortState?.key) return players;
    
    return [...players].sort((a, b) => {
      const aVal = a[sortState.key];
      const bVal = b[sortState.key];
      if (typeof aVal === 'string') {
        return sortState.asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortState.asc ? aVal - bVal : bVal - aVal;
    });
  }, [sortStates]);

  // 폼 입력값 변경 핸들러
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, setter: (value: any) => void) => {
    setter(e.target.value);
  }, []);

=======
>>>>>>> 25516fb66e2c5b0d36bd5238814b08c2f1bca166
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">픽률 분석</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
<<<<<<< HEAD
          <label className="block mb-1 font-medium">조회할 랭커 수</label>
          <input
            type="number"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={rankLimit}
            onChange={(e) => handleInputChange(e, setRankLimit)}
            placeholder="몇 위까지 조회할지 범위 지정"
            onClick={handleInputClick}
            name="rankLimit"
            required
            min="1"
          />
=======
          <h2 className="text-xl font-bold mb-4">분석 조건</h2>
          <PickrateForm />
>>>>>>> 25516fb66e2c5b0d36bd5238814b08c2f1bca166
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">분석 결과</h2>
          <PickrateResults />
        </div>
      </div>
    </div>
  );
}
