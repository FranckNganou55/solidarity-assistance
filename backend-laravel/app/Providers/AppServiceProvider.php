<?php

namespace App\Providers;

use App\Services\ContributionWorkflowService;
use App\Services\GroupAccessService;
use App\Services\MemberManagementService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(GroupAccessService::class);
        $this->app->singleton(ContributionWorkflowService::class);
        $this->app->singleton(MemberManagementService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
