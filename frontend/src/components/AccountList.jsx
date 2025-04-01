const AccountRow = ({ account, level = 0, onEdit, onDelete }) => {
  const hasChildren = account.children && account.children.length > 0;
  const indentStyle = { paddingLeft: `${level * 20}px` };

  return (
    <>
      <tr className={hasChildren ? 'bg-gray-50' : ''}>
        <td className="px-6 py-4 whitespace-nowrap" style={indentStyle}>
          <div className="flex items-center">
            {hasChildren && (
              <span className="mr-2 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            )}
            <div>
              <div className="text-sm font-medium text-gray-900">{account.name}</div>
              {hasChildren && (
                <div className="text-xs text-gray-500">
                  {account.children.length} child{account.children.length !== 1 ? 'ren' : ''}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">{account.type}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">{account.parent?.name || '-'}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            account.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {account.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {account.totalTransactionCount} transactions
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={() => onEdit(account)}
            className="text-indigo-600 hover:text-indigo-900 mr-4"
          >
            Edit
          </button>
          {!hasChildren && (
            <button
              onClick={() => onDelete(account)}
              className="text-red-600 hover:text-red-900"
            >
              Delete
            </button>
          )}
        </td>
      </tr>
      {hasChildren && account.children.map(child => (
        <AccountRow
          key={child._id}
          account={child}
          level={level + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
};

<tbody className="bg-white divide-y divide-gray-200">
  {accounts.map(account => (
    <AccountRow
      key={account._id}
      account={account}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  ))}
</tbody> 