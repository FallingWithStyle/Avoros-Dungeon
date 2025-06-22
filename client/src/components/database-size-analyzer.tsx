
/**
 * File: database-size-analyzer.tsx
 * Responsibility: Display database table sizes and space usage analysis
 * Notes: Shows which tables are consuming the most space for debugging purposes
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Database, Loader2 } from 'lucide-react';

interface TableSize {
  tablename: string;
  size: string;
  size_bytes: number;
  table_size: string;
  index_size: string;
}

interface RowCount {
  table: string;
  count: string;
}

interface DatabaseAnalysis {
  totalDatabaseSize: {
    total_size: string;
    total_size_bytes: number;
  };
  tableSizes: TableSize[];
  rowCounts: RowCount[];
  analysis: {
    largestTables: TableSize[];
    totalTables: number;
  };
}

// Check if debug mode is enabled
const IS_DEBUG_MODE = import.meta.env.DEV || 
                     import.meta.env.VITE_DEBUG === "true" ||
                     typeof window !== "undefined" && window.location.hostname.includes("replit");

export function DatabaseSizeAnalyzer() {
  const [analysis, setAnalysis] = useState<DatabaseAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't render if not in debug mode
  if (!IS_DEBUG_MODE) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">Database analysis is only available in debug mode.</p>
      </div>
    );
  }

  const analyzeDatabase = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/debug/database-size', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch database analysis');
      }

      const data = await response.json();
      if (data.success) {
        setAnalysis(data);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRowCountForTable = (tableName: string): string => {
    const rowCount = analysis?.rowCounts.find(rc => rc.table === tableName);
    return rowCount ? rowCount.count : 'N/A';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Size Analysis
          </CardTitle>
          <CardDescription>
            Analyze which tables are consuming the most database space
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={analyzeDatabase} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Database Size'
            )}
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
              Error: {error}
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* Database Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {analysis.totalDatabaseSize.total_size}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Database Size</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {analysis.analysis.totalTables}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Tables</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {formatBytes(analysis.totalDatabaseSize.total_size_bytes)}
                    </div>
                    <p className="text-sm text-muted-foreground">Raw Size</p>
                  </CardContent>
                </Card>
              </div>

              {/* Largest Tables */}
              <Card>
                <CardHeader>
                  <CardTitle>Largest Tables</CardTitle>
                  <CardDescription>
                    Tables consuming the most space (including indexes)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table Name</TableHead>
                        <TableHead>Total Size</TableHead>
                        <TableHead>Table Data</TableHead>
                        <TableHead>Indexes</TableHead>
                        <TableHead>Row Count</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.tableSizes.slice(0, 10).map((table) => {
                        const rowCount = getRowCountForTable(table.tablename);
                        const sizeInMB = table.size_bytes / (1024 * 1024);
                        let priority = 'low';
                        if (sizeInMB > 10) priority = 'high';
                        else if (sizeInMB > 1) priority = 'medium';

                        return (
                          <TableRow key={table.tablename}>
                            <TableCell className="font-medium">
                              {table.tablename}
                            </TableCell>
                            <TableCell>
                              <Badge variant={priority === 'high' ? 'destructive' : priority === 'medium' ? 'default' : 'secondary'}>
                                {table.size}
                              </Badge>
                            </TableCell>
                            <TableCell>{table.table_size}</TableCell>
                            <TableCell>{table.index_size}</TableCell>
                            <TableCell>{Number(rowCount).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={priority === 'high' ? 'destructive' : priority === 'medium' ? 'default' : 'outline'}>
                                {priority}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {analysis.tableSizes.find(t => t.tablename === 'sessions' && t.size_bytes > 1024 * 1024) && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded">
                        📝 <strong>Sessions table is large:</strong> Consider implementing session cleanup for expired sessions
                      </div>
                    )}
                    {analysis.tableSizes.find(t => t.tablename === 'activities' && t.size_bytes > 5 * 1024 * 1024) && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded">
                        📊 <strong>Activities table is large:</strong> Consider archiving old activity logs
                      </div>
                    )}
                    {analysis.tableSizes.find(t => t.tablename === 'mobs' && t.size_bytes > 2 * 1024 * 1024) && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded">
                        👾 <strong>Mobs table is large:</strong> Consider cleaning up inactive/dead mobs
                      </div>
                    )}
                    {analysis.tableSizes.find(t => t.tablename === 'tactical_positions' && t.size_bytes > 1024 * 1024) && (
                      <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded">
                        🚨 <strong>Tactical positions is MASSIVE ({analysis.tableSizes.find(t => t.tablename === 'tactical_positions')?.size}):</strong> 
                        <br />This table stores redundant mob data. Mobs should only be in the mobs table.
                        <br />
                        <button 
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/debug/cleanup-tactical-positions', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                              });
                              
                              const responseText = await response.text();
                              
                              if (!response.ok) {
                                console.error('Cleanup failed with status', response.status, ':', responseText);
                                alert('Cleanup failed with status ' + response.status + ': ' + responseText.substring(0, 200));
                                return;
                              }
                              
                              // Check if response is HTML (error page)
                              if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
                                console.error('Received HTML response instead of JSON:', responseText.substring(0, 500));
                                alert('Server returned an error page instead of JSON. Check console for details.');
                                return;
                              }
                              
                              let result;
                              try {
                                result = JSON.parse(responseText);
                              } catch (parseError) {
                                console.error('Failed to parse JSON response:', responseText);
                                alert('Invalid JSON response from server: ' + responseText.substring(0, 200));
                                return;
                              }
                              
                              if (result.success) {
                                alert('Cleanup completed! Deleted ' + result.deletedCount + ' records. ' + result.details.spaceSaved);
                                // Refresh the analysis
                                window.location.reload();
                              } else {
                                alert('Cleanup failed: ' + result.error);
                              }
                            } catch (error) {
                              console.error('Network or other error during cleanup:', error);
                              alert('Error running cleanup: ' + error);
                            }
                          }}
                          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          🧹 Run Tactical Cleanup Now
                        </button>
                      </div>
                    )}
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded">
                      💡 <strong>General tip:</strong> PostgreSQL minimum size is ~33MB even when empty. Focus on tables over 1MB.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
